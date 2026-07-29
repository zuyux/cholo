import { bech32 } from 'bech32';
import { keccak256 } from 'js-sha3';
import CryptoJS from 'crypto-js';
import { privateKeyToPublic } from '@stacks/transactions';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import { bech32m } from 'bech32';

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.substr(i, 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const hash160 = (data: Uint8Array): Uint8Array => {
  const hex = bytesToHex(data);
  const sha256 = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(hex));
  const ripemd = CryptoJS.RIPEMD160(sha256).toString(CryptoJS.enc.Hex);
  return hexToBytes(ripemd);
};

export function getBitcoinAddressFromPrivateKey(
  privateKey: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): string {
  const publicKey = privateKeyToPublic(privateKey);
  const publicKeyHex = typeof publicKey === 'string' ? publicKey : bytesToHex(publicKey);
  const publicKeyBytes = hexToBytes(publicKeyHex);
  const witnessProgram = hash160(publicKeyBytes);

  const words = bech32.toWords(witnessProgram);
  words.unshift(0);

  const prefix = network === 'testnet' ? 'tb' : 'bc';
  return bech32.encode(prefix, words);
}

const taggedHash = (tag: string, data: Uint8Array) => {
  const tagHash = sha256(new TextEncoder().encode(tag));
  const merged = new Uint8Array(tagHash.length * 2 + data.length);
  merged.set(tagHash, 0);
  merged.set(tagHash, tagHash.length);
  merged.set(data, tagHash.length * 2);
  return sha256(merged);
};

const bytesToBigInt = (bytes: Uint8Array) =>
  bytes.reduce((value, byte) => (value << BigInt(8)) + BigInt(byte), BigInt(0));

export function getBitcoinTaprootAddressFromPrivateKey(
  privateKey: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): string {
  const inputPrivateKeyHex = privateKey.replace(/^0x/, '');
  const privateKeyHex = inputPrivateKeyHex.length === 66 && inputPrivateKeyHex.endsWith('01')
    ? inputPrivateKeyHex.slice(0, 64)
    : inputPrivateKeyHex;
  const publicKeyBytes = secp.getPublicKey(hexToBytes(privateKeyHex), true);
  let internalPoint = secp.Point.fromHex(bytesToHex(publicKeyBytes));

  if (internalPoint.y & BigInt(1)) {
    internalPoint = internalPoint.negate();
  }

  const internalX = internalPoint.toBytes(false).slice(1, 33);
  const tweak = bytesToBigInt(taggedHash('TapTweak', internalX));
  if (tweak >= secp.Point.CURVE().n) {
    throw new Error('Invalid Taproot tweak');
  }

  const outputPoint = internalPoint.add(secp.Point.BASE.multiply(tweak));
  const outputX = outputPoint.toBytes(false).slice(1, 33);
  const words = bech32m.toWords(outputX);
  words.unshift(1);

  return bech32m.encode(network === 'mainnet' ? 'bc' : 'tb', words);
}

export function getRootstockAddressFromPrivateKey(privateKey: string): string {
  // EVM/Rootstock addresses hash the uncompressed public key without its 04 prefix.
  const privateKeyHex = privateKey.replace(/^0x/, '');
  const normalizedPrivateKey = privateKeyHex.length === 66 && privateKeyHex.endsWith('01')
    ? privateKeyHex.slice(0, -2)
    : privateKeyHex;
  const publicKeyBytes = secp.getPublicKey(hexToBytes(normalizedPrivateKey), false).slice(1);
  const hashed = keccak256(publicKeyBytes);
  const hashBytes = hexToBytes(hashed);
  const addressBytes = hashBytes.slice(-20);
  return `0x${bytesToHex(addressBytes)}`;
}

export function getLiquidAddressFromPrivateKey(
  privateKey: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): string {
  const publicKey = privateKeyToPublic(privateKey);
  const publicKeyHex = typeof publicKey === 'string' ? publicKey : bytesToHex(publicKey);
  const publicKeyBytes = hexToBytes(publicKeyHex);
  const witnessProgram = hash160(publicKeyBytes);

  const words = bech32.toWords(witnessProgram);
  words.unshift(0);

  const prefix = network === 'testnet' ? 'ert' : 'ex';
  return bech32.encode(prefix, words);
}

export async function deriveStacksPrivateKeyFromMnemonic(
  mnemonic: string
): Promise<string> {
  const { mnemonicToSeed } = await import('@scure/bip39');
  const { HDKey } = await import('@scure/bip32');
  const seed = await mnemonicToSeed(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive("m/44'/5757'/0'/0/0");
  if (!child.privateKey) {
    throw new Error('Failed to derive private key from mnemonic');
  }
  return bytesToHex(child.privateKey);
}
