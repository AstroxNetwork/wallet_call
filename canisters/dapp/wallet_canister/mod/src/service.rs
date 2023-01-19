use crate::types::{ExpiryUser, ProxyActorTargets, Settings, WalletStore};
use ic_cdk::api;
use ic_cdk::export::Principal;
use itertools::Itertools;
use std::cell::RefCell;

thread_local! {
    pub static WALLET_STORE: RefCell<WalletStore> = RefCell::new(WalletStore::default());
}
pub fn pre_upgrade() -> WalletStore {
    WALLET_STORE.with(|s| s.take().into())
}

pub fn post_upgrade(stable_state: WalletStore) {
    WALLET_STORE.with(|s| s.replace(stable_state));
}

impl Default for WalletStore {
    fn default() -> Self {
        WalletStore {
            expiry_users: Default::default(),
            settings: Settings {
                expiry_period: 7 * 24 * 60 * 60 * 1000 * 1000 * 1000,
                proxy_black_list: Default::default(),
            },
        }
    }
}

pub struct WalletService;

impl WalletService {
    pub fn add_expiry_user(user: Principal, targets: ProxyActorTargets) -> ExpiryUser {
        WalletService::remove_all_expiries();
        let actual_period = targets
            .expiration
            .map_or_else(|| WalletService::get_setting().expiry_period, |v| v);

        let ts = api::time();
        let rt = ExpiryUser {
            user: user.clone(),
            target_list: targets.targets,
            timestamp: ts.clone(),
            expiry_timestamp: actual_period + ts,
        };
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store.expiry_users.insert(user.clone(), rt.clone());
            rt.clone()
        })
    }

    pub fn is_valid_canister(user: &Principal, canister: &Principal) -> bool {
        match WalletService::get_expiry_user(user) {
            None => false,
            Some(r) => r.target_list.iter().any(|d| d.canister.eq(canister)),
        }
    }

    pub fn is_valid_canister_method(
        user: &Principal,
        canister: &Principal,
        method: &String,
    ) -> bool {
        match WalletService::get_expiry_user(user) {
            None => false,
            Some(r) => r
                .target_list
                .iter()
                .any(|d| d.canister.eq(canister) && d.methods.contains(method)),
        }
    }

    pub fn get_expiry_user(user: &Principal) -> Option<ExpiryUser> {
        WALLET_STORE.with(|s| {
            let store = s.borrow();
            store
                .expiry_users
                .get(&user.clone())
                .map_or_else(|| None, |s| Some(s.clone()))
        })
    }

    pub fn is_valid_user(user: &Principal) -> bool {
        match WalletService::get_expiry_user(user) {
            None => false,
            Some(r) => {
                if r.timestamp + WalletService::get_setting().expiry_period < api::time() {
                    WalletService::remove_expiry_user(user);
                    false
                } else {
                    true
                }
            }
        }
    }

    pub fn add_proxy_black_list(target: Principal) -> String {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store
                .settings
                .proxy_black_list
                .entry(target)
                .or_insert(target.to_text())
                .to_string()
        })
    }
    pub fn remove_proxy_black_list(target: &Principal) -> Option<String> {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store.settings.proxy_black_list.remove(target)
        })
    }

    pub fn is_proxy_black_list(target: &Principal) -> bool {
        WALLET_STORE.with(|s| {
            let store = s.borrow();
            store.settings.proxy_black_list.contains_key(target)
        })
    }

    pub fn set_expiry_period(secs: u64) {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store.settings.expiry_period = secs;
        })
    }

    pub fn remove_expiry_user(user: &Principal) -> Option<ExpiryUser> {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store.expiry_users.remove(user)
        })
    }

    pub fn remove_all_expiries() {
        let all_users = WALLET_STORE.with(|s| {
            let store = s.borrow();
            store.expiry_users.values().map(|d| d.clone()).collect_vec()
        });

        for i in all_users.iter() {
            WalletService::remove_if_expiry(&i.user)
        }
    }

    pub fn remove_if_expiry(user: &Principal) {
        WalletService::get_expiry_user(user).map_or_else(
            || (),
            |f| {
                if ic_cdk::api::time() < f.timestamp + WalletService::get_setting().expiry_period {
                    WalletService::remove_expiry_user(user);
                }
            },
        );
    }

    fn get_setting() -> Settings {
        WALLET_STORE.with(|s| s.borrow().settings.clone())
    }
}
