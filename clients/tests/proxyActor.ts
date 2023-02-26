import { CallResult, Method, MethodType, _SERVICE as walletService } from '@/idls/wallet_canister';
import { idlFactory as walletIDL } from '@/idls/wallet_canister.idl';
import { getActor, getCanisterId, hasOwnProperty, identity } from '@ego-js/utils';
import { Actor, ActorConfig, ActorConstructor, ActorMethod, ActorSubclass, CallConfig, CreateCertificateOptions } from '@dfinity/agent';
import { strategy } from '@dfinity/agent/lib/cjs/polling';
import { Principal } from '@dfinity/principal';

import { IDL } from '@dfinity/candid';
import { resolve } from 'path';

export interface BaseActorItem {
  canister: string;
  methods: Method[];
}

export interface ActorItem<T> extends BaseActorItem {
  actor: ActorSubclass<T>;
}

export interface Targets {
  expiration: [] | [bigint];
  targets: {
    canister: Principal;
    methods: [] | Array<[string, Method]>;
  }[];
}

const DEFAULT_ACTOR_CONFIG = {
  pollingStrategyFactory: strategy.defaultStrategy,
};

function _createProxyActor(wallet_call: ActorSubclass<walletService>, canister: string, idl: IDL.InterfaceFactory): [ActorConstructor, Method[]] {
  const service = idl({ IDL });
  const methods = service._fields.map(f => {
    let method_type: MethodType;
    switch (f[1].annotations[0]) {
      case '' || 'update':
        method_type = { CALL: null };
        break;
      case 'query':
        method_type = { QUERY: null };
        break;
      case 'composite':
        method_type = { CompositeQuery: null };
        break;
      case 'oneway':
        method_type = { OneWay: null };
        break;
      default: {
        method_type = { CALL: null };
        break;
      }
    }

    return {
      name: f[0],
      method_type,
      key_operation: false,
    };
  });

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
        this[methodName] = _createActorMethod(wallet_call, canister !== '' ? Principal.fromText(canister) : Principal.fromHex(''), methodName, func);
      }
    }
  }

  return [ProxyActor, methods];
}

export function createProxyActor<T = Record<string, ActorMethod>>(
  wallet_call: ActorSubclass<walletService>,
  canister: string,
  interfaceFactory: IDL.InterfaceFactory,
): ActorItem<T> {
  const [proxyActor, methods] = _createProxyActor(wallet_call, canister, interfaceFactory);

  const actor = new proxyActor({
    canisterId: canister,
  }) as unknown as ActorSubclass<T>;
  return {
    actor,
    methods,
    canister,
  };
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

function _createActorMethod(wallet_call: ActorSubclass<walletService>, canister: Principal, method_name: string, func: IDL.FuncClass): ActorMethod {
  const caller = async (_: CallConfig, ...args: any[]) => {
    const updateAnnotations = [];
    const newFunc = new IDL.FuncClass(func.argTypes, func.retTypes, updateAnnotations);

    const arg = IDL.encode(newFunc.argTypes, args);
    const response = await wallet_call.proxy_call({
      args: Array.from(new Uint8Array(arg)),
      cycles: BigInt(0),
      method_name,
      canister,
    });
    if (hasOwnProperty(response, 'Ok')) {
      const responseBytes = response.Ok.return;
      return decodeReturnValue(newFunc.retTypes, new Uint8Array(responseBytes));
    } else {
      // console.log(response.Err);
      // throw new Error(response.Err);

      const pollResult = await pollQueueMethod(wallet_call, response.Err, 3, 3000);
      if (pollResult.reject === true) {
        throw new Error('Owner has rejected this call');
      } else {
        if (pollResult.result) {
          if (hasOwnProperty(pollResult.result, 'Ok')) {
            const responseBytes = pollResult.result.Ok.return;
            return decodeReturnValue(newFunc.retTypes, new Uint8Array(responseBytes));
          } else {
            throw new Error(pollResult.result.Err);
          }
        } else {
          throw new Error('No response');
        }
      }
    }
  };
  const handler = (...args: unknown[]) => caller({}, ...args);
  handler.withOptions =
    (options: CallConfig) =>
    (...args: unknown[]) =>
      caller(options, ...args);
  return handler as ActorMethod;
}

export interface KeyOperation {
  canister: string;
  keys: string[];
}

export class ProxyTargets<T extends BaseActorItem> {
  constructor(private actors: T[], private expiration?: bigint) {}

  public buildTargets(keyOperations?: KeyOperation[]): Targets {
    if (keyOperations) {
      for (let index = 0; index < keyOperations.length; index++) {
        const element = keyOperations[index];
        const foundIndex = this.actors.findIndex(a => a.canister === element.canister);
        if (foundIndex > -1) {
          const foundActor = this.actors[foundIndex];
          foundActor.methods.forEach(m => {
            const found = element.keys.findIndex(k => m.name === k);
            if (found > -1) {
              m.key_operation = true;
            }
          });
          this.actors[foundIndex] = foundActor;
        }
      }
    }
    const targets = this.actors.map(e => {
      const methods = e.methods.map(m => {
        return [m.name, m] as [string, Method];
      });
      return {
        canister: Principal.fromText(e.canister),
        methods,
      };
    });

    return {
      expiration: this.expiration ? [this.expiration] : [],
      targets,
    };
  }
}

export interface PollResult {
  result:
    | {
        Ok: CallResult;
      }
    | {
        Err: string;
      }
    | undefined;
  reject: boolean;
}

async function pollQueueMethod(wallet_call: ActorSubclass<walletService>, hash: string, totalRetries: number, interval: number): Promise<PollResult> {
  let result: { Ok: CallResult } | { Err: string } | undefined;
  let reject = false;

  for (let i = 0; i < totalRetries; i += 1) {
    let out = false;

    // test only, jest only runs in one single thread.
    if (i === 2) {
      const walletActor = await getActor<walletService>(identity(), walletIDL, getCanisterId('wallet_canister')!);
      await walletActor.owner_confirm(hash, true);
    }
    const rp = await wallet_call.get_queue_reply(hash);
    // { 'Approved' : Result_3 } |
    // { 'NotFound' : null } |
    // { 'Rejected' : string }
    if (rp.length > 0 && rp[0]) {
      if (hasOwnProperty(rp[0], 'NotFound')) {
        out = false;
      } else if (hasOwnProperty(rp[0], 'Rejected')) {
        reject = true;
        out = true;
      } else if (hasOwnProperty(rp[0], 'Approved')) {
        result = rp[0].Approved;
        reject = false;
        out = true;
      }
    } else {
      out = true;
    }

    if (out) {
      wallet_call.remove_queue_method(hash);
      break;
    } else {
      await sleep(interval);
    }
  }
  return {
    result,
    reject,
  };
}

export function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
