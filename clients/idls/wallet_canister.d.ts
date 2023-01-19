import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface CallCanisterArgs {
  'args' : Array<number>,
  'cycles' : bigint,
  'method_name' : string,
  'canister' : Principal,
}
export interface CallResult { 'return' : Array<number> }
export interface ExpiryUser {
  'user' : Principal,
  'expiry_timestamp' : bigint,
  'timestamp' : bigint,
  'target_list' : Array<ProxyActorItem>,
}
export interface ProxyActorItem {
  'methods' : Array<string>,
  'canister' : Principal,
}
export interface ProxyActorTargets {
  'targets' : Array<ProxyActorItem>,
  'expiration' : [] | [bigint],
}
export type Result = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : Array<string> } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : CallResult } |
  { 'Err' : string };
export interface _SERVICE {
  'add_expiry_user' : ActorMethod<[Principal, ProxyActorTargets], ExpiryUser>,
  'add_proxy_black_list' : ActorMethod<[Principal], string>,
  'balance_get' : ActorMethod<[], Result>,
  'ego_canister_add' : ActorMethod<[string, Principal], Result_1>,
  'ego_controller_add' : ActorMethod<[Principal], Result_1>,
  'ego_controller_remove' : ActorMethod<[Principal], Result_1>,
  'ego_controller_set' : ActorMethod<[Array<Principal>], Result_1>,
  'ego_log_list' : ActorMethod<[bigint], Result_2>,
  'ego_op_add' : ActorMethod<[Principal], Result_1>,
  'ego_owner_add' : ActorMethod<[Principal], Result_1>,
  'ego_owner_remove' : ActorMethod<[Principal], Result_1>,
  'ego_owner_set' : ActorMethod<[Array<Principal>], Result_1>,
  'ego_user_add' : ActorMethod<[Principal], Result_1>,
  'ego_user_remove' : ActorMethod<[Principal], Result_1>,
  'ego_user_set' : ActorMethod<[Array<Principal>], Result_1>,
  'is_proxy_black_list' : ActorMethod<[Principal], boolean>,
  'proxy_call' : ActorMethod<[CallCanisterArgs], Result_3>,
  'remove_proxy_black_list' : ActorMethod<[Principal], [] | [string]>,
  'set_expiry_period' : ActorMethod<[bigint], undefined>,
}
