import { schnorr } from '@noble/secp256k1';
import { bech32 } from 'bech32';

const DEFAULT_NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr.bitcoiner.social',
  'wss://nostr.mutinywallet.com',
];

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function normalizeSecretKey(privateKeyHex: string): string {
  const normalized = privateKeyHex.replace(/^0x/, '');
  // Stacks represents compressed private keys as 32 secret bytes plus `01`.
  // Noble secp256k1 APIs accept only the underlying 32-byte secret.
  return normalized.length === 66 && normalized.endsWith('01')
    ? normalized.slice(0, 64)
    : normalized;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isHexString(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value);
}

export function getNostrPublicKeyFromPrivateKey(privateKeyHex: string): string {
  const privateKey = hexToBytes(normalizeSecretKey(privateKeyHex));
  const publicKeyBytes = schnorr.getPublicKey(privateKey);
  const words = bech32.toWords(publicKeyBytes);
  return bech32.encode('npub', words);
}

export function getNostrSecretKeyFromPrivateKey(privateKeyHex: string): string {
  const privateKey = hexToBytes(normalizeSecretKey(privateKeyHex));
  const words = bech32.toWords(privateKey);
  return bech32.encode('nsec', words);
}

export function decodeNostrPublicKeyToHex(npubOrHex: string): string {
  const trimmed = npubOrHex.trim();
  if (trimmed.startsWith('npub')) {
    const { words } = bech32.decode(trimmed);
    return bytesToHex(Uint8Array.from(bech32.fromWords(words)));
  }
  if (isHexString(trimmed)) {
    return trimmed.toLowerCase();
  }
  throw new Error('Invalid Nostr public key format');
}

export function isNostrPublicKey(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('npub') || isHexString(trimmed);
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(hashBuffer));
}

export type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export async function getNostrEventHash(event: Omit<NostrEvent, 'id' | 'sig'>): Promise<string> {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return await sha256Hex(serialized);
}

export async function signNostrEvent(event: Omit<NostrEvent, 'id' | 'sig'>, privateKeyHex: string): Promise<string> {
  const eventHash = await getNostrEventHash(event);
  const signatureBytes = await schnorr.signAsync(hexToBytes(eventHash), hexToBytes(normalizeSecretKey(privateKeyHex)));
  return bytesToHex(signatureBytes);
}

export async function createNostrMetadataEvent(profile: Record<string, unknown> & { address: string }, privateKeyHex: string): Promise<NostrEvent> {
  const publicKey = getNostrPublicKeyFromPrivateKey(privateKeyHex);
  const pubkeyHex = decodeNostrPublicKeyToHex(publicKey);
  const created_at = Math.floor(Date.now() / 1000);
  const content = JSON.stringify(profile);
  const tags: string[][] = profile.address ? [['p', profile.address]] : [];

  const unsignedEvent = {
    pubkey: pubkeyHex,
    created_at,
    kind: 0,
    tags,
    content,
  };

  const id = await getNostrEventHash(unsignedEvent);
  const sig = await signNostrEvent(unsignedEvent, privateKeyHex);

  return {
    ...unsignedEvent,
    id,
    sig,
  };
}

async function openRelay(relayUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', () => reject(new Error(`Failed to connect to relay: ${relayUrl}`)));
  });
}

export async function publishNostrEvent(event: NostrEvent, relays: string[] = DEFAULT_NOSTR_RELAYS): Promise<boolean> {
  const promises = relays.map(async (relayUrl) => {
    try {
      const ws = await openRelay(relayUrl);
      return await new Promise<boolean>((resolve) => {
        const timeout = window.setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.addEventListener('message', (message) => {
          try {
            const data = JSON.parse(message.data as string);
            if (Array.isArray(data) && data[0] === 'OK' && data[1] === event.id) {
              window.clearTimeout(timeout);
              ws.close();
              resolve(data[2] === true);
            }
          } catch {
            // ignore parse errors
          }
        });

        ws.send(JSON.stringify(['EVENT', event]));
      });
    } catch (error) {
      console.warn('Nostr relay publish failed:', relayUrl, error);
      return false;
    }
  });

  const results = await Promise.all(promises);
  return results.some(Boolean);
}

export async function fetchNostrProfileByAddress(address: string, relays: string[] = DEFAULT_NOSTR_RELAYS): Promise<Record<string, unknown> | null> {
  const filterAddress = address.trim();
  const isNostrKey = isNostrPublicKey(filterAddress);
  const author = isNostrKey ? decodeNostrPublicKeyToHex(filterAddress) : undefined;
  const tags = isNostrKey ? undefined : { '#p': [filterAddress] };

  for (const relayUrl of relays) {
    try {
      const ws = await openRelay(relayUrl);
      const reqId = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const filter: Record<string, unknown> = { kinds: [0], limit: 1 };
      if (author) {
        filter.authors = [author];
      } else if (tags) {
        Object.assign(filter, tags);
      }

      const result = await new Promise<Record<string, unknown> | null>((resolve) => {
        const timeout = window.setTimeout(() => {
          ws.close();
          resolve(null);
        }, 5000);

        ws.addEventListener('message', (message) => {
          try {
            const data = JSON.parse(message.data as string);
            if (!Array.isArray(data)) return;
            if (data[0] === 'EVENT' && data[1] && data[1].kind === 0) {
              window.clearTimeout(timeout);
              ws.close();
              const content = JSON.parse(data[1].content || '{}') as Record<string, unknown>;
              resolve({
                ...content,
                address: content.address || filterAddress,
                created_at: new Date(data[1].created_at * 1000).toISOString(),
              });
            }
            if (data[0] === 'EOSE') {
              window.clearTimeout(timeout);
              ws.close();
              resolve(null);
            }
          } catch {
            // ignore parse errors
          }
        });

        ws.send(JSON.stringify(['REQ', reqId, filter]));
      });

      if (result) {
        return result;
      }
    } catch (error) {
      console.warn('Failed to fetch profile from relay:', relayUrl, error);
    }
  }

  return null;
}
