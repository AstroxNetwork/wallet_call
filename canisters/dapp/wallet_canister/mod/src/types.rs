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

#[derive(CandidType, Serialize, Clone, Deserialize)]
pub struct ProxyActorItem {
    pub canister: Principal,
    pub methods: Vec<String>,
}

#[derive(CandidType, Serialize, Clone, Deserialize)]
pub struct ProxyActorTargets {
    pub expiration: Option<u64>,
    pub targets: Vec<ProxyActorItem>,
}

#[derive(CandidType, Deserialize)]
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

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct WalletStore {
    pub expiry_users: BTreeMap<Principal, ExpiryUser>,
    pub settings: Settings,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub expiry_period: u64,
    pub proxy_black_list: BTreeMap<Principal, String>,
}
