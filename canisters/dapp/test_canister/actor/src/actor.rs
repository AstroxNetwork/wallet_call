use candid::{candid_method, CandidType, Principal};
use ic_cdk::caller;
use ic_cdk_macros::*;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(CandidType, Deserialize)]
pub struct TestArgs {
    pub pid: Principal,
    pub str: String,
    #[serde(with = "serde_bytes")]
    pub bytes: Vec<u8>,
    pub map: HashMap<u32, bool>,
}

#[update(name = "test_call")]
#[candid_method(update, rename = "test_call")]
async fn test_call(args: TestArgs) -> Option<String> {
    ic_cdk::println!(
        "test_call from caller: {}, pid:{}, str: {}, bytes: {}, map:{}",
        caller().to_text(),
        args.pid.to_text(),
        args.str,
        hex::encode(args.bytes.as_slice()),
        serde_json::to_string(&args.map).unwrap()
    );
    let mut res: HashMap<String, String> = HashMap::default();
    res.insert("some".to_string(), "value".to_string());
    res.get("some").map_or_else(|| None, |s| Some(s.clone()))
}

#[update(name = "test_call_key")]
#[candid_method(update, rename = "test_call_key")]
async fn test_call_key(args: TestArgs) -> Option<String> {
    ic_cdk::println!(
        "test_call_key from caller: {}, pid:{}, str: {}, bytes: {}, map:{}",
        caller().to_text(),
        args.pid.to_text(),
        args.str,
        hex::encode(args.bytes.as_slice()),
        serde_json::to_string(&args.map).unwrap()
    );
    let mut res: HashMap<String, String> = HashMap::default();
    res.insert("some".to_string(), "value".to_string());
    res.get("some").map_or_else(|| None, |s| Some(s.clone()))
}

#[query(name = "test_query")]
#[candid_method(query, rename = "test_query")]
async fn test_query(args: TestArgs) -> Option<String> {
    ic_cdk::println!(
        "test_query from caller: {}, pid:{}, str: {}, bytes: {}, map:{}",
        caller().to_text(),
        args.pid.to_text(),
        args.str,
        hex::encode(args.bytes.as_slice()),
        serde_json::to_string(&args.map).unwrap()
    );
    Some("query".to_string())
}
