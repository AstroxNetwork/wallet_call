# Wallet_Call

## What is it?

We use `user-owned wallet` canister to call third_party canister function, instead of using user's principal ID.
The caller will be canister ID.

## How it works?

[see here](test/walletCall.test.ts)

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

2. We use typescript to interact with it.

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

## Requirements

- rust
- nodejs
- dfx client

```bash
sh -ci "$(curl -fsSL https://smartcontracts.org/install.sh)"
```

## Quick Start

0. root folder but a new terminal run dfx, don't close

```bash
dfx start --clean --background
```

1. install dependencies

```bash
    npm install
```

2. Scripts

   1. build canisters

   ```bash
   npm run canisters
   ```

   2. run tests

   ```bash
   npm run test
   ```