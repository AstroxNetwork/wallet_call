import type { _SERVICE as targetService } from '../.dfx/local/canisters/test_canister/test_canister.did';
import { idlFactory as targetIDL } from '../.dfx/local/canisters/test_canister/test_canister.did.js';
import { _SERVICE as walletService } from '../.dfx/local/canisters/wallet_canister/wallet_canister.did';
import { idlFactory as walletIDL } from '../.dfx/local/canisters/wallet_canister/wallet_canister.did.js';
import {
  Actor,
  ActorSubclass, HttpAgent, SignIdentity,
} from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { jest } from '@jest/globals';
import { getIdentity, createActors, getCanisterIds } from '@dfx-js/core';
import { createProxyActor } from '../src/proxy';
import { InterfaceFactory } from '@dfinity/candid/lib/cjs/idl';

const canisterIds = getCanisterIds();
const { identity } = await getIdentity();
const actors = await createActors(Object.keys(canisterIds), identity);
const walletActor = actors.wallet_canister as ActorSubclass<walletService>;

interface CreateActorResult<T> {
  actor: ActorSubclass<T>;
  agent: HttpAgent;
}

const isProduction = false;
async function _createActor<T>(
  interfaceFactory: InterfaceFactory,
  canisterId: string,
  identity?: SignIdentity,
  host?: string,
): Promise<CreateActorResult<T>> {
  const agent = new HttpAgent({
    identity,
    host: host ?? !isProduction ? 'http://0.0.0.0:8000' : 'https://ic0.app',
  });
  // Only fetch the root key when we're not in prod
  if (!isProduction) {
    await agent.fetchRootKey();
  }

  const actor = Actor.createActor<T>(interfaceFactory, {
    agent,
    canisterId: canisterId === '' ? Principal.fromText('aaaaa-aa') : canisterId,
  });
  return { actor, agent };
}

async function getActor<T>(
  signIdentity: SignIdentity,
  interfaceFactory: InterfaceFactory,
  canisterId: string,
): Promise<ActorSubclass<T>> {
  const actor = await _createActor<T>(
    interfaceFactory,
    canisterId,
    signIdentity,
  );

  return actor.actor;
}

describe('walletCall', () => {
  const walletCanisterId = canisterIds.wallet_canister;
  const targetCanisterId = canisterIds.test_canister;
  let proxyActor: ActorSubclass<targetService> | undefined;
  let newTempId = Ed25519KeyIdentity.generate();

  test('just go', async () => {
    proxyActor = createProxyActor<targetService>(
      walletActor,
      targetCanisterId,
      targetIDL,
    );

    // TODO: unauthorized
    const result = await proxyActor.test_call({
      map: Array.from([
        [0, true],
        [1, false],
      ]),
      pid: Principal.fromText(walletCanisterId),
      str: 'damn',
      bytes: Array.from([0, 1, 2, 3, 4]),
    });

    console.log(result);
  });
  test('just throw', async () => {
    const tempActor = getActor<walletService>(
      Ed25519KeyIdentity.generate(),
      walletIDL,
      walletCanisterId,
    );
    const _walletActor = await tempActor;
    proxyActor = createProxyActor<targetService>(
      _walletActor,
      targetCanisterId!,
      targetIDL,
    );

    try {
      await proxyActor.test_call({
        map: Array.from([
          [0, true],
          [1, false],
        ]),
        pid: Principal.fromText(walletCanisterId),
        str: 'damn',
        bytes: Array.from([0, 1, 2, 3, 4]),
      });
    } catch (error) {
      console.log('throw');
      expect(error as Error).toBeTruthy();
    }
  });
  test('authorized call', async () => {
    // TODO: not working
    (walletActor).add_expiry_user(newTempId.getPrincipal(), []);
    const tempActor = getActor<walletService>(
      newTempId,
      walletIDL,
      walletCanisterId,
    );
    const _walletActor = await tempActor;
    proxyActor = createProxyActor<targetService>(
      _walletActor,
      targetCanisterId!,
      targetIDL,
    );

    try {
      let result = await proxyActor.test_call({
        map: Array.from([
          [0, true],
          [1, false],
        ]),
        pid: Principal.fromText(walletCanisterId),
        str: 'update',
        bytes: Array.from([0, 1, 2, 3, 4]),
      });
      console.log(result);
      expect(result).toBeTruthy();
    } catch (error) {
      console.log('throw');
      expect(error as Error).toBeTruthy();
    }

    try {
      let result = await proxyActor.test_query({
        map: Array.from([
          [0, true],
          [1, false],
        ]),
        pid: Principal.fromText(walletCanisterId),
        str: 'query',
        bytes: Array.from([0, 1, 2, 3, 4]),
      });
      console.log(result);
      expect(result).toBeTruthy();
    } catch (error) {
      console.log('throw');
      expect(error as Error).toBeTruthy();
    }
  });
  test('example', async () => {
    (walletActor).set_expiry_period(BigInt(5 * 1000 * 1000 * 1000));
    try {
      await new Promise((resolve, reject) =>
        setTimeout(async () => {
          try {
            resolve(
              await proxyActor!.test_call({
                map: Array.from([
                  [0, true],
                  [1, false],
                ]),
                pid: Principal.fromText(walletCanisterId),
                str: 'expired',
                bytes: Array.from([0, 1, 2, 3, 4]),
              }),
            );
          } catch (error) {
            reject(error);
          }
        }, 5000),
      );
    } catch (error) {
      console.log(error);
      expect(error as Error).toBeTruthy();
    }

    (walletActor).set_expiry_period(
      BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
    );
  });
});
