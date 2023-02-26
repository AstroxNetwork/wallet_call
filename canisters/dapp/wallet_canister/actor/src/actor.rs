use candid::candid_method;

use ego_macros::{inject_app_info, inject_ego_api, inject_ego_data};
use ic_cdk_macros::*;
use std::cell::RefCell;

use wallet_canister_mod::types::{
    CallCanisterArgs, CallResult, ExpiryUser, MethodType, MethodValidationType, OwnerReply,
    ProxyActorTargets, QueueHash,
};

use ic_cdk::trap;
use wallet_canister_mod::service::WalletService;

inject_ego_api!();
inject_ego_data!();
inject_app_info!();

/********************  methods for canister_registry_macro   ********************/
fn on_canister_added(name: &str, canister_id: Principal) {
    ic_cdk::println!(
        "on_canister_added name: {}, canister_id: {}",
        name,
        canister_id
    );
    // user_add_with_name(name.to_string(), canister_id);
}

#[inline(always)]
pub fn owner_or_valid_user_guard() -> Result<(), String> {
    let caller = ic_cdk::api::caller();
    if is_owner(caller.clone()) || (WalletService::is_valid_user(&caller.clone())) {
        Ok(())
    } else {
        trap(&format!("{} unauthorized", caller));
    }
}

pub fn targets_guard(args: CallCanisterArgs<u128>) -> Result<Option<String>, String> {
    let caller = caller();

    if !is_owner(caller) {
        match WalletService::is_proxy_black_list(&args.canister) {
            true => trap(&format!(
                "Canister {} is in proxy black list",
                args.canister.clone()
            )),
            false => match WalletService::is_valid_canister(&caller.clone(), &args.canister) {
                true => {
                    match WalletService::is_valid_canister_method(
                        &caller.clone(),
                        &args.canister,
                        &args.method_name,
                    ) {
                        true => match WalletService::get_method_validate_type() {
                            MethodValidationType::ALL => {
                                let obj = WalletService::hash_method(&caller.clone(), args);
                                let hash = WalletService::add_method_queue(obj);
                                Ok(Some(hash))
                            }
                            MethodValidationType::UPDATE => {
                                match WalletService::get_method_type(
                                    &caller.clone(),
                                    &args.canister,
                                    &args.method_name,
                                ) {
                                    None => trap(&format!(
                                        "Method {} is not in authorized targets",
                                        args.method_name.clone()
                                    )),
                                    Some(r) => {
                                        if r == MethodType::CALL {
                                            let obj =
                                                WalletService::hash_method(&caller.clone(), args);
                                            let hash = WalletService::add_method_queue(obj);
                                            Ok(Some(hash))
                                        } else {
                                            Ok(None)
                                        }
                                    }
                                }
                            }
                            MethodValidationType::KEY => {
                                match WalletService::is_method_key_oper(
                                    &caller.clone(),
                                    &args.canister,
                                    &args.method_name,
                                ) {
                                    true => {
                                        let obj = WalletService::hash_method(&caller.clone(), args);
                                        let hash = WalletService::add_method_queue(obj);
                                        Ok(Some(hash))
                                    }
                                    false => Ok(None),
                                }
                            }
                        },
                        false => trap(&format!(
                            "Method {} is not in authorized targets",
                            args.method_name.clone()
                        )),
                    }
                }
                false => trap(&format!(
                    "Canister {} is not in authorized targets",
                    args.canister.clone()
                )),
            },
        }
    } else {
        Ok(None)
    }
}

#[init]
#[candid_method(init)]
pub fn init() {
    let caller = ic_cdk::api::caller();
    ic_cdk::println!("wallet canister: init, caller is {}", caller.clone());
    ic_cdk::println!("==> add caller as the owner");
    owner_add(caller.clone());
}

#[update(name = "proxy_call", guard = "owner_or_valid_user_guard")]
#[candid_method(update, rename = "proxy_call")]
async fn proxy_call(args: CallCanisterArgs<u128>) -> Result<CallResult, String> {
    match targets_guard(args.clone()) {
        Ok(hash) => {
            if hash.is_none() {
                wallet_canister_mod::wallet_call(args.clone()).await
            } else {
                Err(hash.unwrap())
            }
        }
        Err(r) => trap(&r),
    }
}

#[update(name = "owner_confirm", guard = "owner_guard")]
#[candid_method(update, rename = "owner_confirm")]
async fn owner_confirm(hash: String, approve: bool) -> OwnerReply {
    match WalletService::get_queue_method(hash.clone()) {
        None => OwnerReply::NotFound,
        Some(r) => {
            if approve {
                let call_result = wallet_canister_mod::wallet_call(r.payload.clone()).await;
                let reply = OwnerReply::Approved(call_result);
                WalletService::update_queue_reply(hash.clone(), reply.clone());
                reply.clone()
            } else {
                let reply = OwnerReply::Rejected(hash.clone());
                WalletService::update_queue_reply(hash.clone(), reply.clone());
                reply.clone()
            }
        }
    }
}

#[query(name = "has_queue_method", guard = "owner_or_valid_user_guard")]
#[candid_method(query, rename = "has_queue_method")]
fn has_queue_method(hash: String) -> bool {
    WalletService::get_queue_method(hash).is_some()
}

#[query(name = "get_queue_reply", guard = "owner_or_valid_user_guard")]
#[candid_method(query, rename = "get_queue_reply")]
fn get_queue_reply(hash: String) -> Option<OwnerReply> {
    WalletService::get_queue_reply(hash)
}

#[query(name = "get_queue_unconfirmed", guard = "owner_guard")]
#[candid_method(query, rename = "get_queue_unconfirmed")]
fn get_queue_unconfirmed(user: Principal) -> Vec<QueueHash> {
    WalletService::get_queue_unconfirmed(&user)
}

#[update(name = "remove_queue_method", guard = "owner_or_valid_user_guard")]
#[candid_method(update, rename = "remove_queue_method")]
fn remove_queue_method(hash: String) -> Result<bool, String> {
    let caller = caller();
    match WalletService::get_queue_method(hash.clone()) {
        None => Ok(false),
        Some(r) => {
            if is_owner(caller) || r.user.eq(&caller) {
                Ok(WalletService::remove_queue_method(hash.clone()).is_some())
            } else {
                Err("Not Authorized Execution".to_string())
            }
        }
    }
}

#[update(name = "set_method_validate_type", guard = "owner_guard")]
#[candid_method(update, rename = "set_method_validate_type")]
async fn set_method_validate_type(validate_type: MethodValidationType) {
    WalletService::set_method_validate_type(validate_type)
}

#[update(name = "add_expiry_user", guard = "owner_guard")]
#[candid_method(update, rename = "add_expiry_user")]
async fn add_expiry_user(user: Principal, targets: ProxyActorTargets) -> ExpiryUser {
    WalletService::add_expiry_user(user, targets)
}

#[update(name = "set_expiry_period", guard = "owner_guard")]
#[candid_method(update, rename = "set_expiry_period")]
async fn set_expiry_period(secs: u64) {
    WalletService::set_expiry_period(secs)
}

#[update(name = "add_proxy_black_list", guard = "owner_guard")]
#[candid_method(update, rename = "add_proxy_black_list")]
async fn add_proxy_black_list(target: Principal) -> String {
    WalletService::add_proxy_black_list(target)
}

#[update(name = "remove_proxy_black_list", guard = "owner_guard")]
#[candid_method(update, rename = "remove_proxy_black_list")]
async fn remove_proxy_black_list(target: Principal) -> Option<String> {
    WalletService::remove_proxy_black_list(&target)
}

#[query(name = "is_proxy_black_list")]
#[candid_method(query, rename = "is_proxy_black_list")]
async fn is_proxy_black_list(target: Principal) -> bool {
    WalletService::is_proxy_black_list(&target)
}
