import { Buffer } from 'buffer';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { hmac } from '@noble/hashes/hmac';
import { getLiquidAddressFromPrivateKey } from './bitcoinWallet';

type LiquidAppNetwork = 'mainnet' | 'testnet' | 'devnet';

type LiquidUtxo = {
  txid: string;
  vout: number;
  value?: number;
  asset?: string;
  status?: {
    confirmed?: boolean;
  };
};

type LiquidLib = typeof import('liquidjs-lib');

const SATS_PER_LBTC = 100_000_000;
const SIGHASH_ALL = 0x01;
const DUST_SATS = 100;
const DEFAULT_FEE_RATE = 1;
const MAX_FEE_RATE = 50;
const LIQUID_MAINNET_API_URL = 'https://blockstream.info/liquid/api';

secp.hashes.sha256 = ((message: Uint8Array) => sha256(message) as Uint8Array<ArrayBuffer>) as typeof secp.hashes.sha256;
secp.hashes.hmacSha256 = ((key: Uint8Array, message: Uint8Array) =>
  hmac(sha256, key, message) as Uint8Array<ArrayBuffer>) as typeof secp.hashes.hmacSha256;

const loadLiquid = async () => {
  const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
  globalWithBuffer.Buffer ??= Buffer;
  return import('liquidjs-lib');
};

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

const hash160 = (bytes: Uint8Array) => ripemd160(sha256(bytes));

const normalizePrivateKey = (privateKey: string) => {
  const normalized = privateKey.replace(/^0x/, '').slice(0, 64);
  const bytes = hexToBytes(normalized);
  if (bytes.length !== 32) throw new Error('Invalid Liquid private key');
  return bytes;
};

const derEncodeInteger = (bytes: Uint8Array) => {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start += 1;
  let value = bytes.slice(start);
  if (value[0] & 0x80) {
    value = concatBytes(Uint8Array.of(0), value);
  }
  return concatBytes(Uint8Array.of(0x02, value.length), value);
};

const compactSignatureToDer = (signature: Uint8Array) => {
  if (signature.length !== 64) throw new Error('Invalid signature length');
  const r = derEncodeInteger(signature.slice(0, 32));
  const s = derEncodeInteger(signature.slice(32, 64));
  return concatBytes(Uint8Array.of(0x30, r.length + s.length), r, s);
};

const getLiquidNetwork = (liquid: LiquidLib, network: LiquidAppNetwork) =>
  network === 'mainnet' ? liquid.networks.liquid : liquid.networks.regtest;

const getLiquidApiBaseUrl = (network: LiquidAppNetwork) => {
  if (network !== 'mainnet') {
    throw new Error('Liquid sends are currently supported on mainnet only.');
  }
  return LIQUID_MAINNET_API_URL;
};

const estimateVbytes = (inputCount: number, outputCount: number) =>
  Math.ceil(20 + inputCount * 170 + outputCount * 80);

const parseLbtcToSats = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) {
    return null;
  }

  const [whole, fraction = ''] = trimmed.split('.');
  const wholeSats = BigInt(whole) * BigInt(SATS_PER_LBTC);
  const fractionalSats = BigInt(fraction.padEnd(8, '0'));
  const total = wholeSats + fractionalSats;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  return Number(total);
};

const fetchRecommendedFeeRate = async (baseUrl: string) => {
  try {
    const response = await fetch(`${baseUrl}/fee-estimates`);
    if (!response.ok) throw new Error(`Fee request failed with ${response.status}`);
    const data = await response.json();
    const rate = Number(data?.['1'] ?? data?.['2'] ?? data?.['3'] ?? DEFAULT_FEE_RATE);
    return Math.max(0.1, Math.min(MAX_FEE_RATE, Number.isFinite(rate) ? rate : DEFAULT_FEE_RATE));
  } catch (error) {
    console.warn('Failed to fetch Liquid fee estimate, using fallback:', error);
    return DEFAULT_FEE_RATE;
  }
};

const fetchSpendableUtxos = async (baseUrl: string, address: string, lbtcAssetHash: string) => {
  const response = await fetch(`${baseUrl}/address/${address}/utxo`);
  if (!response.ok) {
    throw new Error(`Unable to fetch Liquid UTXOs (${response.status})`);
  }

  const utxos = await response.json() as LiquidUtxo[];
  const expectedAsset = lbtcAssetHash.toLowerCase();
  return utxos
    .filter((utxo) =>
      Number.isSafeInteger(utxo.value) &&
      Number(utxo.value) > 0 &&
      typeof utxo.asset === 'string' &&
      utxo.asset.toLowerCase() === expectedAsset
    )
    .map((utxo) => ({ ...utxo, value: Number(utxo.value) }))
    .sort((a, b) => {
      if (a.status?.confirmed !== b.status?.confirmed) return a.status?.confirmed ? -1 : 1;
      return Number(b.value) - Number(a.value);
    });
};

const selectCoins = (utxos: Array<LiquidUtxo & { value: number }>, amountSats: number, feeRate: number) => {
  const selected: Array<LiquidUtxo & { value: number }> = [];
  let total = 0;

  for (const utxo of utxos) {
    selected.push(utxo);
    total += utxo.value;

    const feeWithChange = Math.ceil(estimateVbytes(selected.length, 3) * feeRate);
    if (total >= amountSats + feeWithChange) {
      const change = total - amountSats - feeWithChange;
      if (change >= DUST_SATS) {
        return { selected, fee: feeWithChange, change };
      }

      const feeWithoutChange = Math.ceil(estimateVbytes(selected.length, 2) * feeRate);
      if (total >= amountSats + feeWithoutChange) {
        return { selected, fee: total - amountSats, change: 0 };
      }
    }
  }

  throw new Error('Insufficient L-BTC balance for amount and network fee');
};

const assertLiquidRecipientScript = (liquid: LiquidLib, toAddress: string, network: ReturnType<typeof getLiquidNetwork>) => {
  const normalized = toAddress.trim();
  if (liquid.address.isConfidential(normalized)) {
    throw new Error('Confidential Liquid addresses are not supported yet. Use an unconfidential Liquid address.');
  }

  try {
    return liquid.address.toOutputScript(normalized, network);
  } catch {
    throw new Error('Enter a valid unconfidential Liquid address.');
  }
};

const buildSignedTransaction = async ({
  liquid,
  utxos,
  amountSats,
  fee,
  change,
  toAddress,
  changeAddress,
  privateKey,
  network,
}: {
  liquid: LiquidLib;
  utxos: Array<LiquidUtxo & { value: number }>;
  amountSats: number;
  fee: number;
  change: number;
  toAddress: string;
  changeAddress: string;
  privateKey: Uint8Array;
  network: ReturnType<typeof getLiquidNetwork>;
}) => {
  const tx = new liquid.Transaction();
  const publicKey = secp.getPublicKey(privateKey, true);
  const publicKeyHash = hash160(publicKey);
  const scriptCode = Buffer.from(bytesToHex(concatBytes(Uint8Array.of(0x76, 0xa9, 0x14), publicKeyHash, Uint8Array.of(0x88, 0xac))), 'hex');
  const assetBytes = liquid.AssetHash.fromHex(network.assetHash).bytes;
  const unconfidentialNonce = Buffer.alloc(1, 0);

  for (const utxo of utxos) {
    tx.addInput(Buffer.from(utxo.txid, 'hex').reverse(), utxo.vout);
  }

  tx.addOutput(
    assertLiquidRecipientScript(liquid, toAddress, network),
    liquid.ElementsValue.fromNumber(amountSats).bytes,
    assetBytes,
    unconfidentialNonce
  );

  if (change >= DUST_SATS) {
    tx.addOutput(
      assertLiquidRecipientScript(liquid, changeAddress, network),
      liquid.ElementsValue.fromNumber(change).bytes,
      assetBytes,
      unconfidentialNonce
    );
  }

  tx.addOutput(
    Buffer.alloc(0),
    liquid.ElementsValue.fromNumber(fee).bytes,
    assetBytes,
    unconfidentialNonce
  );

  for (let index = 0; index < utxos.length; index += 1) {
    const utxo = utxos[index];
    const sighash = tx.hashForWitnessV0(
      index,
      scriptCode,
      liquid.ElementsValue.fromNumber(utxo.value).bytes,
      SIGHASH_ALL
    );
    const signature = secp.sign(new Uint8Array(sighash), privateKey, { prehash: false, format: 'compact' });
    const signatureWithHashType = concatBytes(compactSignatureToDer(signature), Uint8Array.of(SIGHASH_ALL));
    tx.setWitness(index, [Buffer.from(signatureWithHashType), Buffer.from(publicKey)]);
  }

  return tx.toHex();
};

export function parseLiquidAmount(value: string) {
  return parseLbtcToSats(value);
}

export async function sendLiquidWithKey({
  privateKey,
  toAddress,
  amountLbtc,
  network,
}: {
  privateKey: string;
  toAddress: string;
  amountLbtc: string;
  network: LiquidAppNetwork;
}) {
  const normalizedNetwork = network === 'mainnet' ? 'mainnet' : network === 'devnet' ? 'devnet' : 'testnet';
  const baseUrl = getLiquidApiBaseUrl(normalizedNetwork);
  const liquid = await loadLiquid();
  const liquidNetwork = getLiquidNetwork(liquid, normalizedNetwork);
  const keyBytes = normalizePrivateKey(privateKey);
  const fromAddress = getLiquidAddressFromPrivateKey(bytesToHex(keyBytes), normalizedNetwork === 'mainnet' ? 'mainnet' : 'testnet');
  const amountSats = parseLbtcToSats(amountLbtc);
  if (!amountSats || amountSats <= 0) throw new Error('Enter a valid L-BTC amount');

  assertLiquidRecipientScript(liquid, toAddress, liquidNetwork);

  const [feeRate, utxos] = await Promise.all([
    fetchRecommendedFeeRate(baseUrl),
    fetchSpendableUtxos(baseUrl, fromAddress, liquidNetwork.assetHash),
  ]);

  if (utxos.length === 0) {
    throw new Error('No spendable unconfidential L-BTC UTXOs found for this local wallet');
  }

  const selection = selectCoins(utxos, amountSats, feeRate);
  const rawTxHex = await buildSignedTransaction({
    liquid,
    utxos: selection.selected,
    amountSats,
    fee: selection.fee,
    change: selection.change,
    toAddress,
    changeAddress: fromAddress,
    privateKey: keyBytes,
    network: liquidNetwork,
  });

  const broadcast = await fetch(`${baseUrl}/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: rawTxHex,
  });

  const text = await broadcast.text();
  if (!broadcast.ok) {
    throw new Error(text || `Liquid broadcast failed with ${broadcast.status}`);
  }

  return text.trim();
}
