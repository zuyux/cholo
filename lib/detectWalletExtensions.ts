// Utility to detect installed wallet extensions

declare global {
  interface XverseProviders {
    StacksProvider?: unknown;
    [key: string]: unknown;
  }

  interface Window {
    LeatherProvider?: unknown;
    ethereum?: unknown;
  }
}

type BrowserWalletWindow = typeof window & {
  alby?: unknown;
  nostria?: {
    name?: string;
    request?: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  blockcore?: {
    name?: string;
    request?: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  nostr?: {
    getPublicKey?: () => Promise<string>;
    signEvent?: (event: {
      created_at: number;
      kind: number;
      tags: string[][];
      content: string;
    }) => Promise<unknown>;
  };
  webln?: unknown;
  okxwallet?: {
    bitcoin?: unknown;
  };
  ethereum?: unknown;
};

export function detectWalletExtensions() {
  if (typeof window === 'undefined') return [];
  const wallets = [];
  
  // Leather Wallet
  if ('LeatherProvider' in window) {
    wallets.push({
      id: 'leather',
      name: 'Leather',
      url: 'https://leather.io',
      installed: true,
    });
  } else {
    wallets.push({
      id: 'leather',
      name: 'Leather',
      url: 'https://leather.io',
      installed: false,
    });
  }
  
  // Xverse Wallet
  if ((window.XverseProviders && window.XverseProviders.StacksProvider) || window.StacksProvider) {
    wallets.push({
      id: 'xverse',
      name: 'Xverse',
      url: 'https://xverse.app',
      installed: true,
    });
  } else {
    wallets.push({
      id: 'xverse',
      name: 'Xverse',
      url: 'https://xverse.app',
      installed: false,
    });
  }

  const browserWindow = window as BrowserWalletWindow;
  const hasAlby =
    'alby' in browserWindow ||
    'webln' in browserWindow;

  wallets.push({
    id: 'alby',
    name: 'Alby',
    url: 'https://getalby.com',
    installed: hasAlby,
  });

  wallets.push({
    id: 'nostria',
    name: 'Nostria Signer',
    url: 'https://www.nostria.app/',
    installed: typeof (browserWindow.nostria ?? browserWindow.blockcore)?.request === 'function',
  });

  wallets.push({
    id: 'okx',
    name: 'OKX Wallet',
    url: 'https://web3.okx.com/wallet',
    installed: Boolean(browserWindow.okxwallet?.bitcoin),
  });

  wallets.push({
    id: 'walletconnect',
    name: 'WalletConnect',
    url: 'https://walletconnect.network',
    installed: true,
  });
  
  // MetaMask detection (prevent auto-connection errors)
  if (window.ethereum && (window.ethereum as { isMetaMask?: boolean })?.isMetaMask) {
    // MetaMask is detected but we don't add it to the list since this is a Stacks app
    // This prevents auto-connection attempts that cause the "failed to connect" error
    console.log('MetaMask detected but not supported for Stacks transactions');
  }
  
  return wallets;
}
