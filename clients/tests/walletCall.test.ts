import { _SERVICE as targetService } from '@/idls/test_canister';
import { idlFactory as targetIDL } from '@/idls/test_canister.idl';
import { _SERVICE as walletService } from '@/idls/wallet_canister';
import { idlFactory as walletIDL } from '@/idls/wallet_canister.idl';
import { getActor } from '@/settings/agent';
import { identity } from '@/settings/identity';
import { getCanisterId, hasOwnProperty } from '@/settings/utils';
import {
  Actor,
  ActorConfig,
  ActorConstructor,
  ActorMethod,
  ActorSubclass,
  CallConfig,
  CreateCertificateOptions,
} from '@dfinity/agent';
import { strategy } from '@dfinity/agent/lib/cjs/polling';

import { IDL, JsonValue } from '@dfinity/candid';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { jest } from '@jest/globals';

const DEFAULT_ACTOR_CONFIG = {
  pollingStrategyFactory: strategy.defaultStrategy,
};

function _createProxyActor(
  wallet_call: ActorSubclass<walletService>,
  canister: string,
  idl: IDL.InterfaceFactory,
): ActorConstructor {
  const service = idl({ IDL });

  class ProxyActor extends Actor {
    [x: string]: ActorMethod;

    constructor(config: ActorConfig) {
      super({
        config: {
          ...DEFAULT_ACTOR_CONFIG,
          ...config,
        },
        service,
      });

      for (const [methodName, func] of service._fields) {
        this[methodName] = _createActorMethod(
          wallet_call,
          canister !== ''
            ? Principal.fromText(canister)
            : Principal.fromHex(''),
          methodName,
          func,
        );
      }
    }
  }

  return ProxyActor;
}

function createProxyActor<T = Record<string, ActorMethod>>(
  wallet_call: ActorSubclass<walletService>,
  canister: string,
  interfaceFactory: IDL.InterfaceFactory,
): ActorSubclass<T> {
  return new (_createProxyActor(wallet_call, canister, interfaceFactory))({
    canisterId: canister,
  }) as unknown as ActorSubclass<T>;
}

function decodeReturnValue(types: IDL.Type[], msg: ArrayBuffer) {
  const returnValues = IDL.decode(types, Buffer.from(msg));
  switch (returnValues.length) {
    case 0:
      return undefined;
    case 1:
      return returnValues[0];
    default:
      return returnValues;
  }
}

function _createActorMethod(
  wallet_call: ActorSubclass<walletService>,
  canister: Principal,
  method_name: string,
  func: IDL.FuncClass,
): ActorMethod {
  const caller = async (_: CallConfig, ...args: any[]) => {
    const arg = IDL.encode(func.argTypes, args);
    const response = await wallet_call.proxy_call({
      args: Array.from(new Uint8Array(arg)),
      cycles: BigInt(0),
      method_name,
      canister,
    });
    if (hasOwnProperty(response, 'Ok')) {
      const responseBytes = response.Ok.return;
      return decodeReturnValue(func.retTypes, new Uint8Array(responseBytes));
    } else {
      throw new Error(response.Err);
    }
  };
  const handler = (...args: unknown[]) => caller({}, ...args);
  handler.withOptions =
    (options: CallConfig) =>
    (...args: unknown[]) =>
      caller(options, ...args);
  return handler as ActorMethod;
}

describe('walletCall', () => {
  const walletCanisterId = getCanisterId('wallet_canister')!;
  const walletActor = getActor<walletService>(
    identity,
    walletIDL,
    walletCanisterId,
  );
  const targetCanisterId = getCanisterId('test_canister')!;
  let proxyActor: ActorSubclass<targetService> | undefined;
  let newTempId = Ed25519KeyIdentity.generate();

  test('just go', async () => {
    const _walletActor = await walletActor;
    proxyActor = createProxyActor<targetService>(
      _walletActor,
      targetCanisterId!,
      targetIDL,
    );

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
  test('authoized call', async () => {
    (await walletActor).add_expiry_user(newTempId.getPrincipal());
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
        str: 'damn',
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
    (await walletActor).set_expiry_period(BigInt(5 * 1000 * 1000 * 1000));
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

    (await walletActor).set_expiry_period(
      BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
    );
  });
});