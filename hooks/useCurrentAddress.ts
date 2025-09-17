import { useDevnetWallet } from '@/lib/devnet-wallet-context';
import { useWallet } from '@/components/WalletProvider';

/**
 * Returns the current Stacks address from the devnet wallet context.
 * Returns null if no wallet is selected.
 */
export function useCurrentAddress(): string | null {
  const { currentWallet } = useDevnetWallet?.() || {};
  const { address } = useWallet();
  // Prefer devnet wallet if present, otherwise use extension wallet
  return currentWallet?.stxAddress ?? address ?? null;
}
