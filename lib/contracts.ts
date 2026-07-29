import { getPersistedNetwork, type Network } from './network';

// Contract addresses for different networks
const CONTRACTS = {
  mainnet: {
    SBTC_TOKEN: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token',
  },
  testnet: {
    SBTC_TOKEN: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token',
  },
  devnet: {
    SBTC_TOKEN: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token', // Use testnet for devnet
  },
};

const DEFAULT_SBTC_ASSET_NAME = process.env.NEXT_PUBLIC_SBTC_ASSET_NAME?.trim() || 'sbtc';

export function getSBTCContract(networkOverride?: Network): string {
  const network = networkOverride ?? getPersistedNetwork();
  return CONTRACTS[network]?.SBTC_TOKEN || CONTRACTS.testnet.SBTC_TOKEN;
}

export function getNetworkContracts(networkOverride?: Network) {
  const network = networkOverride ?? getPersistedNetwork();
  return CONTRACTS[network] || CONTRACTS.testnet;
}

export function getSbtcAssetName(): string {
  return DEFAULT_SBTC_ASSET_NAME;
}

export function getSbtcAssetString(networkOverride?: Network): string {
  return `${getSBTCContract(networkOverride)}::${getSbtcAssetName()}`;
}