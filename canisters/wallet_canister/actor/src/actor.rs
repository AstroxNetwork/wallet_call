use candid::candid_method;
use ic_cdk_macros::*;
use wallet_canister_mod::types::{CallCanisterArgs, CallResult, ExpiryUser};

// use astrox_macros::inject_canister_registry;
// use astrox_macros::inject_canister_users;

// ego_types
// use ego_types::registry::Registry;
// use ego_types::user::User;
// use ego_types::log;

// ego_macros
use ego_macros::{inject_app_info_api, inject_ego_api, inject_ego_data, inject_app_info};
use wallet_canister_mod::service::WalletService;
use std::cell::RefCell;
use ic_cdk::trap;

// injection ego apis
inject_ego_data!();
inject_ego_api!();
inject_app_info!();
inject_app_info_api!();
// inject_ego_macros!();

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

#[init]
#[candid_method(init)]
pub fn init() {
    let caller = ic_cdk::api::caller();
    ic_cdk::println!("wallet canister: init, caller is {}", caller.clone());
    ic_cdk::println!("==> add caller as the owner");
    owner_add(caller.clone());
    // TODO: Set btc_init
}

#[update(name = "proxy_call", guard = "owner_or_valid_user_guard")]
// #[update(name = "proxy_call")]
#[candid_method(update, rename = "proxy_call")]
async fn proxy_call(args: CallCanisterArgs<u128>) -> Result<CallResult, String> {
    wallet_canister_mod::wallet_call(args).await
}

#[update(name = "add_expiry_user", guard = "owner_guard")]
// #[update(name = "add_expiry_user")]
#[candid_method(update, rename = "add_expiry_user")]
async fn add_expiry_user(user: Principal, period: Option<u64>) -> ExpiryUser {
    WalletService::add_expiry_user(user, period)
}

#[update(name = "set_expiry_period", guard = "owner_guard")]
// #[update(name = "set_expiry_period")]
#[candid_method(update, rename = "set_expiry_period")]
async fn set_expiry_period(secs: u64) {
    WalletService::set_expiry_period(secs)
}