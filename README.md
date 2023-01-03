# Wallet_Call

## What is it?

We use `user-owned wallet` canister to call third_party canister function, instead of using user's principal ID.
The caller will be canister ID.

## How it works?

[see here](clients/tests/walletCall.test.ts)

Three canister functions are used:

1. `proxy_call`: function entry to call other canister function.
2. `add_expiry_user`: owner define who can call this `proxy_call`, with a expiry date.
3. `set_expiry_period`: set default expiry period for each wallet canister.

A few typescripts are used:

1. `createProxyActor`, to create proxy actor for wallet functions.
2. `createActorMethod`, to create actor method with IDL types.

## Quick Start

1. Target canister candid

```candid
type TestArgs = record {
  map : vec record { nat32; bool };
  pid : principal;
  str : text;
  bytes : vec nat8;
};
service : { test_call : (TestArgs) -> (opt text) }

```

2. We use typescript to ineract with it.

```typescript
// get wallet canister id and wallet canister actor
const walletCanisterId = getCanisterId('wallet_canister')!;
const walletActor = await getActor<walletService>(
  identity, // owner of wallet canister
  walletIDL, // wallet canister IDL
  walletCanisterId,
);

// get target canister ID
const targetCanisterId = getCanisterId('test_canister')!;

// Suppose it is post login principal
let newTempId = Ed25519KeyIdentity.generate();

// add this user to wallet
await walletActor.add_expiry_user(newTempId.getPrincipal());

// create an actor normally
const tempActor = await getActor<walletService>(
  newTempId,
  walletIDL,
  walletCanisterId,
);

// create proxy actor for target canister,
// passing target IDL types, to make linter happy
let proxyActor = createProxyActor<targetService>(
  tempActor,
  targetCanisterId!,
  targetIDL,
);

// now use it as normal call , and get the result
// be aware it is always update call by default.
const result = await proxyActor.test_call({
  map: Array.from([
    [0, true],
    [1, false],
  ]),
  pid: Principal.fromText(walletCanisterId),
  str: 'damn',
  bytes: Array.from([0, 1, 2, 3, 4]),
});

console.log(result);
```

---

## Prequeries

- rust
- nodejs
- dfx client

```bash
sh -ci "$(curl -fsSL https://smartcontracts.org/install.sh)"
```

## bootstrap

0. root folder but a new terminal run dfx, don't close

```
dfx start --clean
```

1. install dependencies

```bash
    npm install pnpm -g && pnpm install
```

2. put seedphrase(12 words) with a name `internal.text`, put it under `credentials` folder

```tree
    credentials/
        internal.txt
```

3. Scripts

   1. install IC Canisters, ledger/II/NNS

   ```bash
   pnpm run pre
   ```

   2. bootstrap and create canister ids

   ```bash
   pnpm run bootstrap
   ```

   3. build projects

   ```bash
    pnpm run build # build all projects
   ```

   4. install projects

   ```bash
    pnpm run install # install install the provider projects
   ```

   5. reinstall projects

   ```bash
    pnpm run reinstall # reinstall all projects
   ```

   6. upgrade projects

   ```bash
    pnpm run upgrade # upgrade all projects
   ```

   6. post install

   ```bash
   pnpm run post_install
   ```

   7. run tests

   ```bash
   pnpm run test
   ```

4. Once and for all

   ```bash

   pnpm run deploy:local # build and deploy the ms_provider project
   pnpm run setup:local # register ms_provider as a wallet provider to ego, and release the ms_controller and btc_wallet wasm
   ```
