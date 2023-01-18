pub mod service;
pub mod types;

use crate::types::{CallCanisterArgs, CallResult};
use ic_cdk::{api, caller};

pub async fn wallet_call(args: CallCanisterArgs<u128>) -> Result<CallResult, String> {
    if api::id() == caller() {
        return Err("Attempted to call forward on self. This is not allowed. Call this method via a different custodian.".to_string());
    }

    match api::call::call_raw128(args.canister, &args.method_name, &args.args, args.cycles).await {
        Ok(x) => Ok(CallResult { r#return: x }),
        Err((code, msg)) => Err(format!(
            "An error happened during the call: {}: {}",
            code as u8, msg
        )),
    }
}
