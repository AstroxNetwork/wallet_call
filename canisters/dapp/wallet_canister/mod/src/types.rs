use candid::CandidType;
use ic_cdk::export::Principal;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(CandidType, Deserialize, Clone)]
pub struct CallCanisterArgs<TCycles> {
    pub canister: Principal,
    pub method_name: String,
    #[serde(with = "serde_bytes")]
    pub args: Vec<u8>,
    pub cycles: TCycles,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub enum MethodType {
    QUERY,
    CALL,
    CompositeQuery,
}

#[derive(CandidType, Serialize, Clone, Deserialize)]
pub struct Method {
    pub name: String,
    pub method_type: MethodType,
    pub key_operation: bool,
}

#[derive(CandidType, Serialize, Clone, Deserialize)]
pub struct ProxyActorItem {
    pub canister: Principal,
    pub methods: BTreeMap<String, Method>,
}

#[derive(CandidType, Serialize, Clone, Deserialize)]
pub struct ProxyActorTargets {
    pub expiration: Option<u64>,
    pub targets: Vec<ProxyActorItem>,
}

#[derive(CandidType, Deserialize, Clone, PartialEq)]
pub struct CallResult {
    #[serde(with = "serde_bytes")]
    pub r#return: Vec<u8>,
}

#[derive(CandidType, Serialize, Clone, Deserialize)]
pub struct ExpiryUser {
    pub user: Principal,
    pub target_list: Vec<ProxyActorItem>,
    pub timestamp: u64,
    pub expiry_timestamp: u64,
}

#[derive(CandidType, Clone)]
pub struct WalletStore<TCycles> {
    pub expiry_users: BTreeMap<Principal, ExpiryUser>,
    pub settings: Settings,
    pub call_queue: BTreeMap<String, MethodQueueItem<TCycles>>,
}

#[derive(CandidType, Clone)]
pub struct MethodQueueItem<TCycles> {
    pub hash: String,
    pub user: Principal,
    pub time_stamp: u64,
    pub payload: CallCanisterArgs<TCycles>,
    pub owner_reply: OwnerReply,
}

#[derive(CandidType, Clone)]
pub struct QueueHash {
    pub hash: String,
    pub user: Principal,
    pub time_stamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub expiry_period: u64,
    pub proxy_black_list: BTreeMap<Principal, String>,
}

#[derive(CandidType, Deserialize, Clone, PartialEq)]
pub enum OwnerReply {
    NotFound,
    Approved(Result<CallResult, String>),
    Rejected(String),
}
