use candid::CandidType;
use ic_cdk::export::Principal;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(CandidType, Deserialize)]
pub struct CallCanisterArgs<TCycles> {
    pub canister: Principal,
    pub method_name: String,
    #[serde(with = "serde_bytes")]
    pub args: Vec<u8>,
    pub cycles: TCycles,
}

#[derive(CandidType, Deserialize)]
pub struct CallResult {
    #[serde(with = "serde_bytes")]
    pub r#return: Vec<u8>,
}

#[derive(CandidType, Serialize, Clone, Deserialize, Copy)]
pub struct ExpiryUser {
    pub user: Principal,
    pub timestamp: u64,
    pub expiry_timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct WalletStore {
    pub expiry_users: BTreeMap<Principal, ExpiryUser>,
    pub settings: Settings,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Copy)]
pub struct Settings {
    pub expiry_period: u64,
}
