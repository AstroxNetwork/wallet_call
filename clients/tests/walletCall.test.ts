import { _SERVICE as targetService } from '@/idls/test_canister';
import { idlFactory as targetIDL } from '@/idls/test_canister.idl';
import { _SERVICE as walletService } from '@/idls/wallet_canister';
import { idlFactory as walletIDL } from '@/idls/wallet_canister.idl';

import { getActor, identity, getCanisterId } from '@ego-js/utils';

import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { ActorSubclass } from '@dfinity/agent/lib/cjs/actor';
import { buildProxyActorTargets, createProxyActor } from './proxyActor';

describe('walletCall', () => {
  const walletCanisterId = getCanisterId('wallet_canister')!;
  const walletActor = getActor<walletService>(identity(), walletIDL, walletCanisterId);
  const targetCanisterId = getCanisterId('test_canister')!;
  let proxyActor: ActorSubclass<targetService> | undefined;
  let newTempId = Ed25519KeyIdentity.generate();

  test('just go', async () => {
    const _walletActor = await walletActor;
    await _walletActor.remove_proxy_black_list(Principal.fromText(targetCanisterId));
    const proxyActorItem = createProxyActor<targetService>(_walletActor, targetCanisterId!, targetIDL);

    const targets = buildProxyActorTargets({ items: [proxyActorItem] });

    proxyActor = proxyActorItem.actor;

    const result = await proxyActor.test_call({
      map: Array.from([
        [0, true],
        [1, false],
      ]),
      pid: Principal.fromText(walletCanisterId),
      str: 'damn',
      bytes: Array.from([0, 1, 2, 3, 4]),
    });

    console.log(`
    1. Calling target function using wallet's owner
    With Result: \n
    ${result}
    `);
    expect(result[0]).toBe('value');
  });

  test('just throw', async () => {
    const tempActor = getActor<walletService>(Ed25519KeyIdentity.generate(), walletIDL, walletCanisterId);
    const _walletActor = await tempActor;
    const proxyActorItem = createProxyActor<targetService>(_walletActor, targetCanisterId!, targetIDL);
    proxyActor = proxyActorItem.actor;

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
      console.log(`
      2. Calling target function using unauthorized principal, throws because unauthorized
      with error: \n
      ${error}
      `);
      expect(error as Error).toBeTruthy();
    }
  });
  test('authoized call', async () => {
    const tempActor = getActor<walletService>(newTempId, walletIDL, walletCanisterId);
    const _walletActor = await tempActor;
    const proxyActorItem = createProxyActor<targetService>(_walletActor, targetCanisterId!, targetIDL);
    const targets = buildProxyActorTargets({ items: [proxyActorItem] });

    const addedResult = await (await walletActor).add_expiry_user(newTempId.getPrincipal(), targets);
    console.log(`
    3. Adding authorized Id to wallet canister, with default expiration period
    with Result: \n
    \{
        user:  ${addedResult.user.toText()}
        timestamp:  ${addedResult.timestamp.toString()}
        expiry_timestamp:  ${addedResult.expiry_timestamp.toString()}
    \}
    `);

    proxyActor = proxyActorItem.actor;

    try {
      let result = await proxyActorItem.actor.test_call({
        map: Array.from([
          [0, true],
          [1, false],
        ]),
        pid: Principal.fromText(walletCanisterId),
        str: 'update',
        bytes: Array.from([0, 1, 2, 3, 4]),
      });
      console.log(`
      4. Calling target function using added principal
      with Result: \n
      ${result}
      `);
      expect(result).toBeTruthy();
    } catch (error) {
      console.log('throw');
      console.log(error);
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
      console.log(`
      5. Calling target query function using added principal,  but update call actually
      with Result: \n
      ${result}
      `);
      expect(result).toBeTruthy();
    } catch (error) {
      console.log('throw');
      console.log(error);
      expect(error as Error).toBeTruthy();
    }
  });
  test('example', async () => {
    (await walletActor).set_expiry_period(BigInt(5 * 1000 * 1000 * 1000));
    console.log('Setting expiration period to 5 seconds, to let the tempID expired');
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
      console.log(`
      6. Calling target function using added principal, throws because expiration
      with error: \n
      ${error}
      `);
      expect(error as Error).toBeTruthy();
    }

    (await walletActor).set_expiry_period(BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000));
  });
});
