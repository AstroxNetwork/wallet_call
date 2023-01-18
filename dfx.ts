import {
  getIdentity,
  defineConfig,
  dfxDefaults,
} from '@dfx-js/core';
import {
  InternetIdentity,
  Ledger,
  NNS,
} from '@dfx-js/canisters';

const currentUser = await getIdentity();

export default defineConfig({
  ...dfxDefaults,
  defaults: {
    build: {
      packtool: '',
    },
    replica: {
      subnet_type: 'system',
    },
    // bitcoin: {
    //   enabled: true,
    //   nodes: ['127.0.0.1:18444'],
    // },
  },
  tasks: {},
  canisters: {
    ledger: Ledger({
      minting_account: currentUser.accountId,
      initial_values: {
        [currentUser.accountId]: 100_000_000_000,
      },
    }),
    internet_identity: InternetIdentity({ owner: currentUser.principal }),
    nns: NNS(),
    test_canister: {
      type: 'rust',
      package: 'test_canister',
      candid: 'canisters/test_canister/test_canister.did',
      wasm: 'target/wasm32-unknown-unknown/release/test_canister.wasm',
      build: 'cargo build --target wasm32-unknown-unknown --release',
    },
    wallet_canister: {
      type: 'rust',
      package: 'wallet_canister',
      candid: 'canisters/wallet_canister/wallet_canister.did',
      wasm: 'target/wasm32-unknown-unknown/release/wallet_canister.wasm',
      build: 'cargo build --target wasm32-unknown-unknown --release',
      // controller: [currentUser.principal],
    },
  },
  scripts: {
    setup: async ({ actors, canisterIds }) => {
      const walletCanisterId = canisterIds.wallet_canister;
      // TODO: receive canisterIds in args
      const {
        wallet_canister,
        test_canister,
      }: {
        wallet_canister: import('.dfx/local/canisters/wallet_canister/wallet_canister.did')._SERVICE
        test_canister: import('.dfx/local/canisters/test_canister/test_canister.did')._SERVICE
      } = actors;
    },
  },
});
