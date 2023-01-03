use candid::candid_method;
use ic_cdk_macros::*;
use wallet_canister_mod::types::{CallCanisterArgs, CallResult, ExpiryUser};

use astrox_macros::inject_canister_registry;
use astrox_macros::inject_canister_users;
use ego_lib::inject_ego_macros;
use ic_cdk::storage;
use wallet_canister_mod::service::WalletService;

inject_canister_users!();
inject_canister_registry!();
inject_ego_macros!();

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
#[candid_method(update, rename = "proxy_call")]
async fn proxy_call(args: CallCanisterArgs<u128>) -> Result<CallResult, String> {
    wallet_canister_mod::wallet_call(args).await
}

#[update(name = "add_expiry_user", guard = "owner_guard")]
#[candid_method(update, rename = "add_expiry_user")]
async fn add_expiry_user(user: Principal) -> Option<ExpiryUser> {
    WalletService::add_expiry_user(user)
}

#[update(name = "set_expiry_period", guard = "owner_guard")]
#[candid_method(update, rename = "set_expiry_period")]
async fn set_expiry_period(secs: u64) {
    WalletService::set_expiry_period(secs)
}