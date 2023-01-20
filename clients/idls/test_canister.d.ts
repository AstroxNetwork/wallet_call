import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface TestArgs {
  'map' : Array<[number, boolean]>,
  'pid' : Principal,
  'str' : string,
  'bytes' : Array<number>,
}
export interface _SERVICE {
  'test_call' : ActorMethod<[TestArgs], [] | [string]>,
  'test_call_key' : ActorMethod<[TestArgs], [] | [string]>,
  'test_query' : ActorMethod<[TestArgs], [] | [string]>,
}
