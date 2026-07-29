import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { keccak_256 } from 'js-sha3';

type RootstockNetwork = 'mainnet' | 'testnet' | 'devnet';

const ROOTSTOCK_CHAIN_IDS: Record<RootstockNetwork, number> = {
  mainnet: 30,
  testnet: 31,
  devnet: 31,
};

const ROOTSTOCK_RPC_URLS: Record<RootstockNetwork, string> = {
  mainnet: 'https://public-node.rsk.co',
  testnet: 'https://public-node.testnet.rsk.co',
  devnet: 'https://public-node.testnet.rsk.co',
};

const GAS_LIMIT_NATIVE_TRANSFER = BigInt(21_000);
const DEFAULT_GAS_PRICE_WEI = BigInt(60_000_000);
const RBTC_DECIMALS = 18;

const concatBytes = (...arrays: Uint8Array[]) => {
  const length = arrays.reduce((total, array) => total + array.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
};

secp.hashes.sha256 = ((message: Uint8Array) => sha256(message) as Uint8Array<ArrayBuffer>) as typeof secp.hashes.sha256;
secp.hashes.hmacSha256 = ((key: Uint8Array, message: Uint8Array) =>
  hmac(sha256, key, message) as Uint8Array<ArrayBuffer>) as typeof secp.hashes.hmacSha256;

const hexToBytes = (hex: string) => {
  const normalized = hex.replace(/^0x/, '');
  if (normalized.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');

const keccak = (bytes: Uint8Array) => new Uint8Array(keccak_256.arrayBuffer(bytes));

const bigintToBytes = (value: bigint) => {
  if (value < BigInt(0)) throw new Error('Negative values cannot be encoded');
  if (value === BigInt(0)) return new Uint8Array();
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) hex = `0${hex}`;
  return hexToBytes(hex);
};

const normalizePrivateKey = (privateKey: string) => {
  const normalized = privateKey.replace(/^0x/, '').slice(0, 64);
  const bytes = hexToBytes(normalized);
  if (bytes.length !== 32) throw new Error('Invalid Rootstock private key');
  return bytes;
};

const assertEvmAddress = (address: string) => {
  const normalized = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    throw new Error('Enter a valid Rootstock EVM address');
  }
  return normalized.toLowerCase();
};

const rlpEncodeBytes = (value: Uint8Array): Uint8Array => {
  if (value.length === 1 && value[0] < 0x80) return value;
  if (value.length <= 55) return concatBytes(Uint8Array.of(0x80 + value.length), value);
  const lengthBytes = bigintToBytes(BigInt(value.length));
  return concatBytes(Uint8Array.of(0xb7 + lengthBytes.length), lengthBytes, value);
};

const rlpEncodeList = (items: Uint8Array[]): Uint8Array => {
  const payload = concatBytes(...items);
  if (payload.length <= 55) return concatBytes(Uint8Array.of(0xc0 + payload.length), payload);
  const lengthBytes = bigintToBytes(BigInt(payload.length));
  return concatBytes(Uint8Array.of(0xf7 + lengthBytes.length), lengthBytes, payload);
};

const rlpEncode = (value: Uint8Array | bigint | string | Array<Uint8Array | bigint | string>): Uint8Array => {
  if (Array.isArray(value)) return rlpEncodeList(value.map(rlpEncode));
  if (typeof value === 'bigint') return rlpEncodeBytes(bigintToBytes(value));
  if (typeof value === 'string') return rlpEncodeBytes(hexToBytes(value));
  return rlpEncodeBytes(value);
};

const parseRbtcToWei = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
    return null;
  }
  const [whole, fraction = ''] = trimmed.split('.');
  return BigInt(whole) * BigInt(10) ** BigInt(RBTC_DECIMALS) + BigInt(fraction.padEnd(RBTC_DECIMALS, '0'));
};

const toQuantityHex = (value: bigint) => `0x${value.toString(16)}`;

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) throw new Error(`Rootstock RPC ${method} failed with ${response.status}`);
  const payload = await response.json();
  if (payload?.error) {
    throw new Error(payload.error.message || `Rootstock RPC ${method} failed`);
  }
  return payload.result as T;
}

function signLegacyTransaction({
  nonce,
  gasPrice,
  gasLimit,
  to,
  value,
  chainId,
  privateKey,
}: {
  nonce: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  to: string;
  value: bigint;
  chainId: number;
  privateKey: Uint8Array;
}) {
  const unsignedFields: Array<Uint8Array | bigint | string> = [
    nonce,
    gasPrice,
    gasLimit,
    to,
    value,
    new Uint8Array(),
    BigInt(chainId),
    BigInt(0),
    BigInt(0),
  ];
  const unsignedTx = rlpEncode(unsignedFields);
  const digest = keccak(unsignedTx);
  const signature = secp.sign(digest, privateKey, { prehash: false, format: 'recovered' });
  const recovery = signature[0];
  const r = BigInt(`0x${bytesToHex(signature.slice(1, 33))}`);
  const s = BigInt(`0x${bytesToHex(signature.slice(33, 65))}`);
  const v = BigInt(chainId * 2 + 35 + recovery);

  return `0x${bytesToHex(rlpEncode([
    nonce,
    gasPrice,
    gasLimit,
    to,
    value,
    new Uint8Array(),
    v,
    r,
    s,
  ]))}`;
}

export function parseRbtcAmount(value: string) {
  return parseRbtcToWei(value);
}

export async function sendRootstockWithKey({
  privateKey,
  toAddress,
  amountRbtc,
  network,
}: {
  privateKey: string;
  toAddress: string;
  amountRbtc: string;
  network: RootstockNetwork;
}) {
  const normalizedNetwork = network === 'mainnet' ? 'mainnet' : network === 'devnet' ? 'devnet' : 'testnet';
  const chainId = ROOTSTOCK_CHAIN_IDS[normalizedNetwork];
  const rpcUrl = ROOTSTOCK_RPC_URLS[normalizedNetwork];
  const keyBytes = normalizePrivateKey(privateKey);
  const to = assertEvmAddress(toAddress);
  const value = parseRbtcToWei(amountRbtc);
  if (!value || value <= BigInt(0)) throw new Error('Enter a valid RBTC amount');

  const publicKey = secp.getPublicKey(keyBytes, false).slice(1);
  const fromAddress = `0x${bytesToHex(keccak(publicKey).slice(-20))}`;
  const [nonceHex, gasPriceHex] = await Promise.all([
    rpcCall<string>(rpcUrl, 'eth_getTransactionCount', [fromAddress, 'pending']),
    rpcCall<string>(rpcUrl, 'eth_gasPrice', []),
  ]);

  const nonce = BigInt(nonceHex);
  const gasPrice = BigInt(gasPriceHex || toQuantityHex(DEFAULT_GAS_PRICE_WEI));
  const rawTx = signLegacyTransaction({
    nonce,
    gasPrice: gasPrice > BigInt(0) ? gasPrice : DEFAULT_GAS_PRICE_WEI,
    gasLimit: GAS_LIMIT_NATIVE_TRANSFER,
    to,
    value,
    chainId,
    privateKey: keyBytes,
  });

  return rpcCall<string>(rpcUrl, 'eth_sendRawTransaction', [rawTx]);
}
