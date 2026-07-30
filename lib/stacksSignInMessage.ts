import { AddressPurpose, BitcoinNetworkType, request as satsRequest } from 'sats-connect';

import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';

const CHOLO_SIGN_IN_DOMAIN = 'cholo.meme';
const CHOLO_SIGN_IN_URI = 'https://cholo.meme';
const CHOLO_SIGN_IN_STATEMENT = 'CHOLO';
const CHOLO_SIGN_IN_VERSION = '1';
const CHOLO_SIGN_IN_CHAIN_ID = '1';
const CHOLO_SIGN_IN_NETWORK = BitcoinNetworkType.Mainnet;
const MAINNET_STACKS_ADDRESS_PREFIXES = ['SP', 'SM'];

type RpcSignatureResponse = {
  result?: {
    signature?: string;
    publicKey?: string;
  };
  signature?: string;
  publicKey?: string;
};

type StacksSignInSignature = {
  signature: string;
  publicKey?: string;
  message: string;
};

type WalletConnectAddress = {
  purpose?: string;
  address?: string;
};

type WalletConnectResponse = {
  status?: string;
  result?: {
    addresses?: WalletConnectAddress[];
  };
  addresses?: WalletConnectAddress[];
  error?: unknown;
};

type StacksAddressResponse = {
  result?: {
    addresses?: WalletConnectAddress[];
  };
  addresses?: WalletConnectAddress[];
};

type RpcCapableProvider = {
  request: (method: string, params?: unknown) => Promise<unknown>;
};

const createNonce = () => {
  const bytes = new Uint8Array(32);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const buildCholoStacksSignInMessage = (address: string, issuedAt = new Date()) => {
  return [
    `${CHOLO_SIGN_IN_DOMAIN} wants you to sign in with your Stacks account:`,
    address,
    CHOLO_SIGN_IN_STATEMENT,
    `URI: ${CHOLO_SIGN_IN_URI}`,
    `Version: ${CHOLO_SIGN_IN_VERSION}`,
    `Chain ID: ${CHOLO_SIGN_IN_CHAIN_ID}`,
    `Nonce: ${createNonce()}`,
    `Issued At: ${issuedAt.toISOString()}`,
  ].join('\n');
};

const assertMainnetStacksAddress = (address: string, walletLabel: string) => {
  const prefix = address.slice(0, 2).toUpperCase();

  if (!MAINNET_STACKS_ADDRESS_PREFIXES.includes(prefix)) {
    throw new Error(`${walletLabel} returned a testnet Stacks address. Switch your wallet to mainnet and try again.`);
  }
};

const parseSignatureResponse = (response: unknown, message: string): StacksSignInSignature => {
  const payload = (response as RpcSignatureResponse)?.result ?? (response as RpcSignatureResponse);

  if (!payload || typeof payload.signature !== 'string') {
    throw new Error('Wallet returned an invalid sign-in signature.');
  }

  return {
    signature: payload.signature,
    publicKey: typeof payload.publicKey === 'string' ? payload.publicKey : undefined,
    message,
  };
};

const normalizeSignInError = (error: unknown, walletLabel: string) => {
  const fallback = `Failed to sign in with ${walletLabel}.`;
  const message = getWalletErrorMessage(error, fallback);

  if (isWalletRequestCancelled(error) || /cancel|reject/i.test(message)) {
    return 'Wallet connection was cancelled. Please try again.';
  }

  return message;
};

export const requestXverseMainnetStacksAddress = async (): Promise<string> => {
  const response = await satsRequest('wallet_connect', {
    addresses: [AddressPurpose.Stacks],
    network: CHOLO_SIGN_IN_NETWORK,
  }) as WalletConnectResponse;

  if (response.status && response.status !== 'success') {
    throw response.error ?? new Error('Failed to connect to Xverse.');
  }

  const stacksAddress = (response.result?.addresses ?? response.addresses)?.find(
    (address) => address.purpose === AddressPurpose.Stacks
  )?.address;

  if (!stacksAddress) {
    throw new Error('No mainnet Stacks address found in Xverse. Switch Xverse to mainnet and try again.');
  }

  assertMainnetStacksAddress(stacksAddress, 'Xverse');

  return stacksAddress;
};

export const requestLeatherMainnetStacksAddress = async (provider: RpcCapableProvider): Promise<string> => {
  const requests: Array<[string, unknown?]> = [
    ['stx_getAddresses', { network: 'mainnet' }],
    ['getAddresses', { network: 'mainnet' }],
    ['getAddresses'],
  ];

  for (const [method, params] of requests) {
    try {
      const response = await provider.request(method, params);
      const addresses = ((response as StacksAddressResponse)?.result?.addresses ?? (response as StacksAddressResponse)?.addresses) ?? [];
      const stacksAddress = addresses.find(
        (address) => address.purpose === AddressPurpose.Stacks || address.address?.toUpperCase().startsWith('S')
      )?.address;

      if (stacksAddress) {
        assertMainnetStacksAddress(stacksAddress, 'Leather');
        return stacksAddress;
      }
    } catch (error) {
      if (error instanceof Error && /testnet Stacks address/i.test(error.message)) {
        throw error;
      }
    }
  }

  throw new Error('No mainnet Stacks address found in Leather. Switch Leather to mainnet and try again.');
};

export const requestLeatherStacksSignIn = async (
  provider: RpcCapableProvider,
  address: string
): Promise<StacksSignInSignature> => {
  assertMainnetStacksAddress(address, 'Leather');
  const message = buildCholoStacksSignInMessage(address);

  try {
    const response = await provider.request('stx_signMessage', { message });
    return parseSignatureResponse(response, message);
  } catch (error) {
    throw new Error(normalizeSignInError(error, 'Leather'));
  }
};

export const requestXverseStacksSignIn = async (address: string): Promise<StacksSignInSignature> => {
  assertMainnetStacksAddress(address, 'Xverse');
  const message = buildCholoStacksSignInMessage(address);

  try {
    const response = await satsRequest('stx_signMessage', { message });
    return parseSignatureResponse(response, message);
  } catch (error) {
    throw new Error(normalizeSignInError(error, 'Xverse'));
  }
};
