export type Network = 'mainnet' | 'testnet' | 'devnet';

const MAINNET_PREFIXES = ['SP', 'SM'];
const TESTNET_PREFIXES = ['ST', 'SN'];

export function getPersistedNetwork(): Network {
  if (typeof window !== 'undefined') {
    try {
      const storedNetwork = localStorage.getItem('network');
      if (
        storedNetwork === 'mainnet' ||
        storedNetwork === 'testnet' ||
        storedNetwork === 'devnet'
      ) {
        return storedNetwork as Network;
      }
    } catch (error) {
      console.error('Failed to access network from localStorage:', error);
    }
  }
  return (process.env.NEXT_PUBLIC_STACKS_NETWORK as Network) || 'testnet';
}

export function persistNetwork(newNetwork: Network): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('network', newNetwork);
    } catch (error) {
      console.error('Failed to set network in localStorage:', error);
    }
  }
}

export function inferNetworkFromAddress(address?: string | null): Network | null {
  if (!address) return null;
  const prefix = address.slice(0, 2).toUpperCase();
  if (MAINNET_PREFIXES.includes(prefix)) return 'mainnet';
  if (TESTNET_PREFIXES.includes(prefix)) return 'testnet';
  return null;
}