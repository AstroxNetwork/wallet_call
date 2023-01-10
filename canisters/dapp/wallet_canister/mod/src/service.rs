use crate::types::{ExpiryUser, Settings, WalletStore};
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
            },
        }
    }
}

pub struct WalletService;

impl WalletService {
    pub fn add_expiry_user(user: Principal, period: Option<u64>) -> ExpiryUser {
        WalletService::remove_all_expiries();
        let actual_period =
            period.map_or_else(|| WalletService::get_setting().expiry_period, |v| v);
        let ts = api::time();
        let rt = ExpiryUser {
            user: user.clone(),
            timestamp: ts.clone(),
            expiry_timestamp: actual_period + ts,
        };
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store.expiry_users.insert(user.clone(), rt.clone());
            rt.clone()
        })
    }

    pub fn get_expiry_user(user: &Principal) -> Option<ExpiryUser> {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow();
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
        WALLET_STORE.with(|s| s.borrow().settings)
    }
}
