'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type WalletType = 'leather' | 'xverse' | 'alby' | 'nostria' | 'okx' | 'walletconnect' | 'imported';

const WALLET_ADDRESS_STORAGE_KEY = 'walletAddress';
const WALLET_TYPE_STORAGE_KEY = 'walletType';
const WELCOME_MODAL_PENDING_STORAGE_KEY = 'bbox-welcome-modal-pending';
export const WELCOME_MODAL_AFTER_SIGN_IN_EVENT = 'bbox-welcome-modal-after-sign-in';

interface WalletContextType {
  address: string | null;
  setAddress: (address: string | null) => void;
  walletType: WalletType | null;
  setWalletType: (type: WalletType | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const normalizeWalletType = (value: string | null): WalletType | null => {
  return value === 'leather' || value === 'xverse' || value === 'alby' || value === 'nostria' || value === 'okx' || value === 'walletconnect' || value === 'imported'
    ? value
    : null;
};

export const getCachedWalletState = () => {
  if (typeof window === 'undefined') {
    return { address: null, walletType: null };
  }

  return {
    address: localStorage.getItem(WALLET_ADDRESS_STORAGE_KEY),
    walletType: normalizeWalletType(localStorage.getItem(WALLET_TYPE_STORAGE_KEY)),
  };
};

export const persistCachedWalletState = (address: string | null, walletType: WalletType | null) => {
  if (typeof window === 'undefined') return;

  if (address) {
    localStorage.setItem(WALLET_ADDRESS_STORAGE_KEY, address);
  } else {
    localStorage.removeItem(WALLET_ADDRESS_STORAGE_KEY);
  }

  if (walletType) {
    localStorage.setItem(WALLET_TYPE_STORAGE_KEY, walletType);
  } else {
    localStorage.removeItem(WALLET_TYPE_STORAGE_KEY);
  }

  window.dispatchEvent(new Event('bbox-wallet-update'));
};

export const queueWelcomeModalAfterSignIn = (address: string) => {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem(WELCOME_MODAL_PENDING_STORAGE_KEY, address);
  window.dispatchEvent(
    new CustomEvent(WELCOME_MODAL_AFTER_SIGN_IN_EVENT, {
      detail: { address },
    })
  );
};

export const consumeQueuedWelcomeModalAddress = () => {
  if (typeof window === 'undefined') return null;

  const pendingAddress = sessionStorage.getItem(WELCOME_MODAL_PENDING_STORAGE_KEY);
  if (pendingAddress) {
    sessionStorage.removeItem(WELCOME_MODAL_PENDING_STORAGE_KEY);
  }

  return pendingAddress;
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(() => getCachedWalletState().address);
  const [walletType, setWalletType] = useState<WalletType | null>(() => getCachedWalletState().walletType);

  // Persist wallet address for Xverse and Leather
  const restoreWalletState = () => {
    if (typeof window === 'undefined') return;

    const { address: savedAddress, walletType: savedType } = getCachedWalletState();

    setAddress(savedAddress);
    setWalletType(savedType);
  };

  useEffect(() => {
    restoreWalletState();

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key === WALLET_ADDRESS_STORAGE_KEY || event.key === WALLET_TYPE_STORAGE_KEY) {
        restoreWalletState();
      }
    };

    window.addEventListener('bbox-wallet-update', restoreWalletState);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('bbox-wallet-update', restoreWalletState);
      window.removeEventListener('storage', handleStorage);
    };
  }, []); // Intentionally empty - only run on mount to restore saved address

  useEffect(() => {
    persistCachedWalletState(address, walletType);
  }, [address, walletType]);

  return (
    <WalletContext.Provider value={{ address, setAddress, walletType, setWalletType }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
