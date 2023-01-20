use crate::types::{
    ExpiryUser, MethodQueueItem, OwnerReply, ProxyActorTargets, QueueHash, Settings, WalletStore,
};
use crate::CallCanisterArgs;
use ic_cdk::api;
use ic_cdk::export::Principal;
use itertools::Itertools;
use sha2::{Digest, Sha256};

use std::cell::RefCell;

thread_local! {
    pub static WALLET_STORE: RefCell<WalletStore<u128>> = RefCell::new(WalletStore::default());
}
pub fn pre_upgrade() -> WalletStore<u128> {
    WALLET_STORE.with(|s| s.take().into())
}

pub fn post_upgrade(stable_state: WalletStore<u128>) {
    WALLET_STORE.with(|s| s.replace(stable_state));
}

impl Default for WalletStore<u128> {
    fn default() -> Self {
        WalletStore {
            expiry_users: Default::default(),
            settings: Settings {
                expiry_period: 7 * 24 * 60 * 60 * 1000 * 1000 * 1000,
                proxy_black_list: Default::default(),
            },
            call_queue: Default::default(),
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
        method_name: &String,
    ) -> bool {
        match WalletService::get_expiry_user(user) {
            None => false,
            Some(r) => r
                .target_list
                .iter()
                .any(|d| d.canister.eq(canister) && d.methods.contains_key(method_name)),
        }
    }

    pub fn is_method_key_oper(
        user: &Principal,
        canister: &Principal,
        method_name: &String,
    ) -> bool {
        match WalletService::get_expiry_user(user) {
            None => false,
            Some(r) => r
                .target_list
                .iter()
                .find(|d| {
                    d.canister.eq(canister)
                        && d.methods
                            .get(method_name.as_str())
                            .map_or_else(|| false, |e| e.key_operation)
                })
                .is_some(),
        }
    }

    pub fn hash_method(user: &Principal, args: CallCanisterArgs<u128>) -> MethodQueueItem<u128> {
        let mut sha = Sha256::default();
        let ts = ic_cdk::api::time();
        sha.update(user.clone().as_slice());
        sha.update(args.canister.as_slice());
        sha.update(args.method_name.as_bytes());
        sha.update(ts.to_be_bytes().as_slice());

        MethodQueueItem {
            hash: hex::encode(sha.finalize().as_slice()),
            user: user.clone(),
            time_stamp: ts.clone(),
            payload: args,
            owner_reply: OwnerReply::NotFound,
        }
    }

    pub fn update_queue_reply(hash: String, reply: OwnerReply) -> Option<OwnerReply> {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store.call_queue.get_mut(&hash).map_or_else(
                || None,
                |r| {
                    r.owner_reply = reply.clone();
                    Some(reply.clone())
                },
            )
        })
    }

    pub fn get_queue_method(hash: String) -> Option<MethodQueueItem<u128>> {
        WALLET_STORE.with(|s| {
            let store = s.borrow();
            match store.call_queue.get(&hash) {
                None => None,
                Some(r) => Some(r.clone()),
            }
        })
    }

    pub fn get_queue_reply(hash: String) -> Option<OwnerReply> {
        match WalletService::get_queue_method(hash) {
            None => None,
            Some(r) => Some(r.owner_reply),
        }
    }

    pub fn get_queue_unconfirmed(user: &Principal) -> Vec<QueueHash> {
        WALLET_STORE.with(|s| {
            s.borrow()
                .call_queue
                .iter()
                .filter(|f| f.1.user.eq(user) && f.1.owner_reply != OwnerReply::NotFound)
                .map(|d| QueueHash {
                    hash: d.1.hash.clone(),
                    user: d.1.user.clone(),
                    time_stamp: d.1.time_stamp.clone(),
                })
                .collect_vec()
        })
    }

    pub fn remove_queue_method(hash: String) -> Option<String> {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store
                .call_queue
                .remove(&hash)
                .map_or_else(|| None, |_| Some(hash.clone()))
        })
    }

    pub fn add_method_queue(item: MethodQueueItem<u128>) -> String {
        WALLET_STORE.with(|s| {
            let mut store = s.borrow_mut();
            store
                .call_queue
                .entry(item.hash.clone())
                .or_insert(item.clone());
            item.hash.clone()
        })
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
