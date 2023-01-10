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
await walletActor.add_expiry_user(
  newTempId.getPrincipal(),
  [], // expiration period is option for each user, if not set, use global setting
);

// create an actor normally
const tempActor = await getActor<walletService>(newTempId, walletIDL, walletCanisterId);

// create proxy actor for target canister,
// passing target IDL types, to make linter happy
let proxyActor = createProxyActor<targetService>(tempActor, targetCanisterId!, targetIDL);

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

## ENV setup

- rust 1.65.0+
- dfx 0.12.1+
- didc [download binary](https://github.com/dfinity/candid/releases), export PATH to `didc`

- **!! Important !! Setup Credentials**

  - Under `credentials` folder, you need to add 3 files.
    1.  `seedPhrase.txt`: 12 words mnemonic phrases, to create secp256k1 account for local test
    2.  `production.pem`: pem file with secp256k1 curve encoded, use for `mainnet` deployment
    3.  `production_cycles_wallet.txt`: cycles wallet of mainnet, use for `mainnet` deployment
  - You can change file names on `ego-config`.json

- setup project, see `ego-projects.json`,

## Quick Start

1. `pnpm install`
2. `pnpm run ego:run` to create and deploy
3. `pnpm run test ego_example` to run test file in `clients/tests`
