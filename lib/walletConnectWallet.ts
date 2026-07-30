export type WalletConnectConnection = {
  address: string;
};

type EthereumProvider = {
  request: (request: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  enable?: () => Promise<unknown>;
  connect?: () => Promise<void>;
  accounts?: string[];
  session?: unknown;
  disconnect?: () => Promise<void>;
};

let providerPromise: Promise<EthereumProvider> | null = null;

const getProjectId = () => process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

const getStringArray = (payload: unknown) => {
  if (Array.isArray(payload)) return payload.filter((value): value is string => typeof value === 'string');
  if (payload && typeof payload === 'object' && Array.isArray((payload as { result?: unknown }).result)) {
    return (payload as { result: unknown[] }).result.filter((value): value is string => typeof value === 'string');
  }
  return [];
};

const stringToHex = (value: string) => {
  return `0x${Array.from(new TextEncoder().encode(value))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
};

const getWalletConnectProvider = async (): Promise<EthereumProvider> => {
  if (typeof window === 'undefined') {
    throw new Error('WalletConnect is only available in the browser.');
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable WalletConnect login.');
  }

  if (!providerPromise) {
    providerPromise = import('@walletconnect/ethereum-provider').then(async ({ default: EthereumProvider }) => {
      return EthereumProvider.init({
        projectId,
        chains: [1],
        optionalChains: [30, 56, 137, 42161, 8453],
        showQrModal: true,
        metadata: {
          name: 'CHOLO',
          description: 'CHOLO app authentication',
          url: window.location.origin,
          icons: [`${window.location.origin}/android-chrome-192x192.png`],
        },
      }) as Promise<EthereumProvider>;
    });
  }

  return providerPromise;
};

const requestAccounts = async (provider: EthereumProvider) => {
  const accounts = provider.enable
    ? getStringArray(await provider.enable())
    : getStringArray(provider.accounts);

  if (!accounts.length && provider.connect && !provider.session) {
    await provider.connect();
    accounts.push(...getStringArray(provider.accounts));
  }

  if (!accounts.length) {
    accounts.push(...getStringArray(await provider.request({ method: 'eth_requestAccounts' })));
  }

  const address = accounts[0]?.trim();
  if (!address) {
    throw new Error('No EVM address found from WalletConnect. Choose a wallet account and try again.');
  }
  return address;
};

export const connectWalletConnect = async (): Promise<WalletConnectConnection> => {
  const provider = await getWalletConnectProvider();
  const address = await requestAccounts(provider);
  return { address };
};

export const signWalletConnectMessage = async (message: string): Promise<{ signature: string }> => {
  const provider = await getWalletConnectProvider();
  const accounts = provider.session
    ? getStringArray(await provider.request({ method: 'eth_accounts' }))
    : [];
  const address = accounts[0]?.trim() || await requestAccounts(provider);
  const response = await provider.request({ method: 'personal_sign', params: [stringToHex(message), address] });

  if (typeof response !== 'string' || !response.trim()) {
    throw new Error('WalletConnect returned an invalid signature payload');
  }

  return { signature: response.trim() };
};
