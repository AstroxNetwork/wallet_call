# MultiSig

- Developers: Upload and maintain canister wasm, and frontend applications. Pay to install or free to use.
- Admin/Auditors/Committee: set roles, audit wasm code, progress network updates and governance.
- Users: Install and use his/her owned DApps through his/her wallet.

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
