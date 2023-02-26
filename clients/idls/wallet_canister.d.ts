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
export interface Method {
  'name' : string,
  'method_type' : MethodType,
  'key_operation' : boolean,
}
export type MethodType = { 'CALL' : null } |
  { 'OneWay' : null } |
  { 'CompositeQuery' : null } |
  { 'QUERY' : null };
export type MethodValidationType = { 'ALL' : null } |
  { 'KEY' : null } |
  { 'UPDATE' : null };
export type OwnerReply = { 'Approved' : Result_3 } |
  { 'NotFound' : null } |
  { 'Rejected' : string };
export interface ProxyActorItem {
  'methods' : Array<[string, Method]>,
  'canister' : Principal,
}
export interface ProxyActorTargets {
  'targets' : Array<ProxyActorItem>,
  'expiration' : [] | [bigint],
}
export interface QueueHash {
  'hash' : string,
  'user' : Principal,
  'time_stamp' : bigint,
}
export type Result = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_1 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : Array<string> } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : CallResult } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : boolean } |
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
  'get_queue_reply' : ActorMethod<[string], [] | [OwnerReply]>,
  'get_queue_unconfirmed' : ActorMethod<[Principal], Array<QueueHash>>,
  'has_queue_method' : ActorMethod<[string], boolean>,
  'is_proxy_black_list' : ActorMethod<[Principal], boolean>,
  'owner_confirm' : ActorMethod<[string, boolean], OwnerReply>,
  'proxy_call' : ActorMethod<[CallCanisterArgs], Result_3>,
  'remove_proxy_black_list' : ActorMethod<[Principal], [] | [string]>,
  'remove_queue_method' : ActorMethod<[string], Result_4>,
  'set_expiry_period' : ActorMethod<[bigint], undefined>,
  'set_method_validate_type' : ActorMethod<[MethodValidationType], undefined>,
}
