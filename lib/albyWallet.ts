import { bech32 } from 'bech32';

export type AlbyConnection = {
  address: string;
  publicKeyHex: string;
};

type NostrProvider = {
  getPublicKey?: () => Promise<string>;
  signEvent?: (event: {
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
  }) => Promise<{
    id?: string;
    pubkey?: string;
    sig?: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
  }>;
};

type WebLNProvider = {
  enable?: () => Promise<void>;
};

type AlbyProvider = {
  nostr?: NostrProvider;
  webln?: WebLNProvider;
  enable?: () => Promise<void>;
};

declare global {
  interface Window {
    alby?: AlbyProvider;
    nostr?: NostrProvider;
    webln?: WebLNProvider;
  }
}

const NOSTR_PUBLIC_KEY_HEX_REGEX = /^[0-9a-fA-F]{64}$/;

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.trim().toLowerCase();
  if (!NOSTR_PUBLIC_KEY_HEX_REGEX.test(normalized)) {
    throw new Error('Alby returned an invalid Nostr public key.');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
};

export const encodeNostrPublicKey = (publicKeyHex: string): string => {
  const words = bech32.toWords(hexToBytes(publicKeyHex));
  return bech32.encode('npub', words);
};

export const isAlbyAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;

  const alby = window.alby;

  return Boolean(
    alby ||
      window.nostr?.getPublicKey ||
      window.webln
  );
};

export const connectAlbyWallet = async (): Promise<AlbyConnection> => {
  if (typeof window === 'undefined') {
    throw new Error('Alby can only be connected in the browser.');
  }

  const nostrProvider = window.alby?.nostr ?? window.nostr;
  const webLNProvider = window.alby?.webln ?? window.webln;

  if (window.alby?.enable) {
    await window.alby.enable();
  } else if (webLNProvider?.enable) {
    await webLNProvider.enable();
  }

  if (!nostrProvider?.getPublicKey) {
    throw new Error('Alby Nostr permissions are not available. Enable Nostr in Alby and try again.');
  }

  const publicKeyHex = (await nostrProvider.getPublicKey()).trim().toLowerCase();

  return {
    address: encodeNostrPublicKey(publicKeyHex),
    publicKeyHex,
  };
};
