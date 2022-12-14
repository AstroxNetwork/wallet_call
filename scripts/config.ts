export interface ProjectConfig {
  category: string;
  package: string;
  bin_name: string;
  config: string;
  private?: string;
  public?: string;
  url?: string;
  custom_candid?: boolean;
  // if pass true, builder.js won't build, and will ignore all build script
  no_build?: boolean;
  // if pass this script, builder.js will run this shell
  custom_build?: string;
  // if pass true, deployer.js won't deploy, and will ignore all deploy script
  no_deploy?: boolean;
  // if pass this script, deployer.js will run this shell
  custom_deploy?: string | (() => void) | (() => Promise<void>);
  // if pass this script, deployer.js will run this shell after first install/deploy
  post_install_sequence?: number;
}

export type Configs = Array<ProjectConfig>;

export const infraConfig: Configs = [
  {
    category: 'dapp',
    package: 'test_canister',
    bin_name: 'test-canister',
    config: './configs/test_canister.json',
    post_install_sequence: 100,
  },
  {
    category: 'dapp',
    package: 'wallet_canister',
    bin_name: 'wallet-canister',
    config: './configs/wallet_canister.json',
    post_install_sequence: 99,
    no_deploy: false,
  },
  // {
  //   category: 'dapp',
  //   package: 'btc_wallet',
  //   bin_name: 'btc-wallet',
  //   config: './configs/btc_wallet.json',
  //   post_install_sequence: 98,
  //   no_deploy: true,
  // },
];

export const appsConfig: Configs = [];

export const dfxConfigTemplate = {
  canisters: {},
  defaults: {
    build: {
      packtool: '',
    },
    bitcoin: {
      enabled: true,
      nodes: ['127.0.0.1:18444'],
    },
  },
  networks: {
    local: {
      bind: '127.0.0.1:8000',
      type: 'ephemeral',
    },
    mainnet: {
      providers: ['https://identity.ic0.app'],
      type: 'persistent',
    },
  },
  version: 1,
};
