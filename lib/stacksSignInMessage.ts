import { AddressPurpose, BitcoinNetworkType, request as satsRequest } from 'sats-connect';

import { getWalletErrorMessage, isWalletRequestCancelled } from './walletErrors';

import { validateStacksAddress } from '@stacks/transactions';
import { inferNetworkFromAddress } from './network';

const CHOLO_SIGN_IN_DOMAIN = 'cholo.meme';
const CHOLO_SIGN_IN_URI = 'https://cholo.meme';
const CHOLO_SIGN_IN_STATEMENT = 'CHOLO';
const CHOLO_SIGN_IN_VERSION = '1';
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
  symbol?: string;
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
    `Chain ID: ${inferNetworkFromAddress(address) === 'testnet' ? '2147483648' : '1'}`,
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

// Omitting the network lets Leather return its currently selected account/network.
// Never retry a cancellation or convert a returned address to a different network.
export const requestLeatherStacksAddress = async (provider: RpcCapableProvider): Promise<string> => {
  const methods = ['getAddresses', 'stx_getAddresses'];
  for (const method of methods) {
    let response: unknown;
    try {
      response = await provider.request(method);
      const rpcError = (response as { error?: unknown })?.error;
      if (rpcError) throw rpcError;
    } catch (error) {
      const code = (error as { code?: number; error?: { code?: number } })?.code
        ?? (error as { error?: { code?: number } })?.error?.code;
      if (code === -32601 && method === methods[0]) continue;
      throw new Error(normalizeSignInError(error, 'Leather'));
    }
    const addresses = (response as StacksAddressResponse)?.result?.addresses ?? (response as StacksAddressResponse)?.addresses;
    if (!Array.isArray(addresses)) throw new Error('Leather returned an invalid address response.');
    const candidates = addresses.filter((entry) => entry && typeof entry.address === 'string' &&
      validateStacksAddress(entry.address) && inferNetworkFromAddress(entry.address));
    const unique = [...new Set(candidates.map((entry) => entry.address!))];
    if (unique.length !== 1) throw new Error('Leather did not return a single active Stacks account. Select an account and network in Leather, then reconnect.');
    return unique[0];
  }
  throw new Error('Leather does not support address requests. Update the extension and try again.');
};

export const requestLeatherStacksSignIn = async (
  provider: RpcCapableProvider,
  address: string,
  message = buildCholoStacksSignInMessage(address),
): Promise<StacksSignInSignature> => {
  const network = inferNetworkFromAddress(address);
  if (!network || !validateStacksAddress(address)) throw new Error('Invalid Stacks sign-in address.');

  try {
    const response = await provider.request('stx_signMessage', { message, messageType: 'utf8', network });
    const rpcError = (response as { error?: unknown })?.error;
    if (rpcError) throw rpcError;
    return parseSignatureResponse(response, message);
  } catch (error) {
    throw new Error(normalizeSignInError(error, 'Leather'));
  }
};

export const requestXverseStacksSignIn = async (address: string, message = buildCholoStacksSignInMessage(address)): Promise<StacksSignInSignature> => {
  assertMainnetStacksAddress(address, 'Xverse');

  try {
    const response = await satsRequest('stx_signMessage', { message });
    return parseSignatureResponse(response, message);
  } catch (error) {
    throw new Error(normalizeSignInError(error, 'Xverse'));
  }
};
