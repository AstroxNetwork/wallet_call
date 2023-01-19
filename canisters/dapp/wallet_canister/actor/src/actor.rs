use candid::candid_method;

use ego_macros::{inject_app_info, inject_ego_api, inject_ego_data};
use ic_cdk_macros::*;
use std::cell::RefCell;

use wallet_canister_mod::types::{CallCanisterArgs, CallResult, ExpiryUser, ProxyActorTargets};

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

pub fn targets_guard(canister: &Principal) -> Result<(), String> {
    let caller = caller();
    match WalletService::is_proxy_black_list(canister) {
        true => trap(&format!(
            "Canister {} is in proxy black list",
            canister.clone()
        )),
        false => {
            if !is_owner(caller) {
                match WalletService::is_valid_canister(&caller.clone(), canister) {
                    true => Ok(()),
                    false => trap(&format!(
                        "Canister {} is not in authorized targets",
                        canister.clone()
                    )),
                }
            } else {
                Ok(())
            }
        }
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
    match targets_guard(&args.canister) {
        Ok(_) => wallet_canister_mod::wallet_call(args.clone()).await,
        Err(r) => trap(&r),
    }
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
