export type Network = 'mainnet' | 'testnet' | 'devnet';

export function getPersistedNetwork(): Network {
  // Always return mainnet since we're fixing the network
  return 'mainnet';
}

export function persistNetwork(newNetwork: Network): void {
  // Always use mainnet, ignore the parameter
  console.log(`Network change to ${newNetwork} ignored - mainnet is fixed`);
}