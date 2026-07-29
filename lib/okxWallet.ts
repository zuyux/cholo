export type OkxConnection = {
  address: string;
  publicKey?: string;
  addressType?: OkxBitcoinAddressType;
  label?: string;
};

export type OkxBitcoinAddressType = 'taproot' | 'legacy' | 'nested-segwit' | 'native-segwit' | 'unknown';

export type OkxBitcoinAccount = OkxConnection & {
  address: string;
  addressType: OkxBitcoinAddressType;
  label: string;
};

type OkxBitcoinProvider = {
  requestAccounts?: () => Promise<unknown>;
  getAccounts?: () => Promise<unknown>;
  signMessage?: (message: string, type?: string) => Promise<unknown>;
};

type OkxWalletProvider = {
  bitcoin?: OkxBitcoinProvider;
};

type OkxBrowserWindow = typeof window & {
  okxwallet?: OkxWalletProvider;
};

const getOkxBitcoinProvider = (): OkxBitcoinProvider | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as OkxBrowserWindow).okxwallet?.bitcoin;
};

const getStringValue = (value: unknown, keys: string[]) => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const nextValue = record[key];
    if (typeof nextValue === 'string' && nextValue.trim()) {
      return nextValue.trim();
    }
  }
  return undefined;
};

const normalizeAddressType = (value: string | undefined, address: string): OkxBitcoinAddressType => {
  const normalized = String(value || '').toLowerCase().replace(/[\s_]/g, '-');
  if (normalized.includes('taproot') || normalized.includes('p2tr') || address.toLowerCase().startsWith('bc1p')) return 'taproot';
  if (normalized.includes('legacy') || normalized.includes('p2pkh') || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
    return address.startsWith('3') || normalized.includes('nested') ? 'nested-segwit' : 'legacy';
  }
  if (normalized.includes('nested') || normalized.includes('p2sh') || normalized.includes('segwit-compatible')) return 'nested-segwit';
  if (normalized.includes('native') || normalized.includes('p2wpkh') || address.toLowerCase().startsWith('bc1q')) return 'native-segwit';
  return 'unknown';
};

const getAddressTypeLabel = (type: OkxBitcoinAddressType) => {
  switch (type) {
    case 'taproot':
      return 'Taproot';
    case 'legacy':
      return 'Legacy';
    case 'nested-segwit':
      return 'Nested SegWit';
    case 'native-segwit':
      return 'Native SegWit';
    default:
      return 'Bitcoin';
  }
};

const unwrapPayload = (payload: unknown) => {
  return payload && typeof payload === 'object' && 'result' in payload
    ? (payload as { result?: unknown }).result
    : payload;
};

const parseOkxAccountValue = (payload: unknown, fallbackType?: OkxBitcoinAddressType): OkxBitcoinAccount | null => {
  const account = unwrapPayload(payload);

  if (typeof account === 'string' && account.trim()) {
    const address = account.trim();
    const addressType = fallbackType ?? normalizeAddressType(undefined, address);
    return { address, addressType, label: getAddressTypeLabel(addressType) };
  }

  const address = getStringValue(account, ['address', 'paymentAddress', 'btcAddress']);
  if (!address) return null;

  const rawType = getStringValue(account, ['addressType', 'type', 'format', 'name', 'label']);
  const addressType = fallbackType ?? normalizeAddressType(rawType, address);

  return {
    address,
    addressType,
    label: rawType && rawType.length < 28 ? getAddressTypeLabel(addressType) : getAddressTypeLabel(addressType),
    publicKey: getStringValue(account, ['publicKey', 'pubkey', 'pubKey']),
  };
};

const parseNamedAddressFields = (payload: unknown): OkxBitcoinAccount[] => {
  const value = unwrapPayload(payload);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const fields: Array<[OkxBitcoinAddressType, string[]]> = [
    ['taproot', ['taproot', 'taprootAddress', 'p2tr', 'p2trAddress']],
    ['legacy', ['legacy', 'legacyAddress', 'p2pkh', 'p2pkhAddress']],
    ['nested-segwit', ['nestedSegwit', 'nestedSegWit', 'nestedSegwitAddress', 'nestedSegWitAddress', 'p2sh', 'p2shAddress']],
    ['native-segwit', ['nativeSegwit', 'nativeSegWit', 'nativeSegwitAddress', 'nativeSegWitAddress', 'p2wpkh', 'p2wpkhAddress']],
  ];

  return fields.flatMap(([addressType, keys]) => {
    for (const key of keys) {
      const account = parseOkxAccountValue(record[key], addressType);
      if (account) return [account];
    }
    return [];
  });
};

export const parseOkxAccounts = (payload: unknown): OkxBitcoinAccount[] => {
  const value = payload && typeof payload === 'object' && 'result' in payload
    ? (payload as { result?: unknown }).result
    : payload;
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { addresses?: unknown[] }).addresses)
      ? (value as { addresses: unknown[] }).addresses
      : [value];
  const accounts = candidates
    .map((account) => parseOkxAccountValue(account))
    .filter((account): account is OkxBitcoinAccount => Boolean(account));
  const namedAccounts = parseNamedAddressFields(value);
  const deduped = [...accounts, ...namedAccounts].filter((account, index, all) => {
    return all.findIndex((candidate) => candidate.address === account.address) === index;
  });

  return deduped.sort((a, b) => {
    const order: Record<OkxBitcoinAddressType, number> = {
      taproot: 0,
      legacy: 1,
      'nested-segwit': 2,
      'native-segwit': 3,
      unknown: 4,
    };
    return order[a.addressType] - order[b.addressType];
  });
};

export const isOkxWalletAvailable = () => Boolean(getOkxBitcoinProvider());

export const connectOkxWallet = async (): Promise<OkxConnection> => {
  const provider = getOkxBitcoinProvider();
  if (!provider) {
    throw new Error('OKX Wallet was not detected. Install OKX Wallet or enable it for this page, then refresh and try again.');
  }

  const response = provider.requestAccounts
    ? await provider.requestAccounts()
    : provider.getAccounts
      ? await provider.getAccounts()
      : null;
  const account = parseOkxAccounts(response)[0];

  if (!account?.address) {
    throw new Error('No Bitcoin address found in OKX Wallet. Unlock OKX Wallet and try again.');
  }

  return account;
};

export const getOkxBitcoinAccounts = async (): Promise<OkxBitcoinAccount[]> => {
  const provider = getOkxBitcoinProvider();
  if (!provider?.getAccounts) {
    return [];
  }

  return parseOkxAccounts(await provider.getAccounts());
};

export const signOkxBitcoinMessage = async (message: string): Promise<{ signature: string; publicKey?: string }> => {
  const provider = getOkxBitcoinProvider();
  if (!provider?.signMessage) {
    throw new Error('OKX Wallet message signing is not available. Reconnect OKX Wallet and try again.');
  }

  const response = await provider.signMessage(message, 'ecdsa');
  const signature = typeof response === 'string'
    ? response
    : getStringValue(response, ['signature', 'sig']);

  if (!signature) {
    throw new Error('OKX Wallet returned an invalid signature payload');
  }

  return {
    signature,
    publicKey: getStringValue(response, ['publicKey', 'pubkey', 'pubKey']),
  };
};
