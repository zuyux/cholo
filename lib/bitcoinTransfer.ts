import { bech32 } from 'bech32';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { hmac } from '@noble/hashes/hmac';
import { getBitcoinAddressFromPrivateKey } from './bitcoinWallet';

type BitcoinNetwork = 'mainnet' | 'testnet' | 'devnet';

type Utxo = {
  txid: string;
  vout: number;
  value: number;
  status?: {
    confirmed?: boolean;
  };
};

const SIGHASH_ALL = 0x01;
const DUST_SATS = 546;
const DEFAULT_FEE_RATE = 5;
const MAX_FEE_RATE = 250;

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

const sha256d = (bytes: Uint8Array) => sha256(sha256(bytes));
const hash160 = (bytes: Uint8Array) => ripemd160(sha256(bytes));

const uint32LE = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
};

const uint64LE = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Invalid satoshi amount');
  }
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
  return bytes;
};

const reverseBytes = (bytes: Uint8Array) => Uint8Array.from(bytes).reverse();

const varInt = (value: number): Uint8Array => {
  if (value < 0xfd) return Uint8Array.of(value);
  if (value <= 0xffff) {
    const bytes = new Uint8Array(3);
    bytes[0] = 0xfd;
    new DataView(bytes.buffer).setUint16(1, value, true);
    return bytes;
  }
  const bytes = new Uint8Array(5);
  bytes[0] = 0xfe;
  new DataView(bytes.buffer).setUint32(1, value, true);
  return bytes;
};

const pushData = (bytes: Uint8Array) => concatBytes(varInt(bytes.length), bytes);

const normalizePrivateKey = (privateKey: string) => {
  const normalized = privateKey.replace(/^0x/, '').slice(0, 64);
  const bytes = hexToBytes(normalized);
  if (bytes.length !== 32) throw new Error('Invalid Bitcoin private key');
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

const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const base58CheckDecode = (value: string) => {
  let num = BigInt(0);
  for (const char of value) {
    const index = base58Alphabet.indexOf(char);
    if (index === -1) throw new Error('Invalid base58 address');
    num = num * BigInt(58) + BigInt(index);
  }

  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.unshift(Number(num % BigInt(256)));
    num /= BigInt(256);
  }

  for (const char of value) {
    if (char !== '1') break;
    bytes.unshift(0);
  }

  const payload = Uint8Array.from(bytes);
  if (payload.length < 5) throw new Error('Invalid base58 address');

  const body = payload.slice(0, -4);
  const checksum = payload.slice(-4);
  const expected = sha256d(body).slice(0, 4);
  if (bytesToHex(checksum) !== bytesToHex(expected)) {
    throw new Error('Invalid base58 address checksum');
  }

  return body;
};

const addressToScriptPubKey = (address: string, network: BitcoinNetwork) => {
  const expectedBech32 = network === 'mainnet' ? 'bc' : 'tb';
  const normalized = address.trim();

  if (/^(bc1|tb1)/i.test(normalized)) {
    const decoded = bech32.decode(normalized, 1000);
    if (decoded.prefix !== expectedBech32) {
      throw new Error(`Recipient must be a Bitcoin ${network === 'mainnet' ? 'mainnet' : 'testnet'} address`);
    }

    const version = decoded.words[0];
    const program = Uint8Array.from(bech32.fromWords(decoded.words.slice(1)));
    if (version === 0 && program.length === 20) return concatBytes(Uint8Array.of(0x00, 0x14), program);
    if (version === 0 && program.length === 32) return concatBytes(Uint8Array.of(0x00, 0x20), program);
    if (version === 1 && program.length === 32) return concatBytes(Uint8Array.of(0x51, 0x20), program);
    throw new Error('Unsupported Bitcoin witness address');
  }

  const decoded = base58CheckDecode(normalized);
  const version = decoded[0];
  const hash = decoded.slice(1);
  if (hash.length !== 20) throw new Error('Invalid legacy Bitcoin address');

  const p2pkhVersion = network === 'mainnet' ? 0x00 : 0x6f;
  const p2shVersion = network === 'mainnet' ? 0x05 : 0xc4;
  if (version === p2pkhVersion) {
    return concatBytes(Uint8Array.of(0x76, 0xa9, 0x14), hash, Uint8Array.of(0x88, 0xac));
  }
  if (version === p2shVersion) {
    return concatBytes(Uint8Array.of(0xa9, 0x14), hash, Uint8Array.of(0x87));
  }

  throw new Error(`Recipient must be a Bitcoin ${network === 'mainnet' ? 'mainnet' : 'testnet'} address`);
};

const getMempoolBaseUrl = (network: BitcoinNetwork) =>
  network === 'mainnet'
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

const estimateVbytes = (inputCount: number, outputCount: number) =>
  Math.ceil(10.5 + inputCount * 68 + outputCount * 31);

const serializeOutput = (value: number, scriptPubKey: Uint8Array) =>
  concatBytes(uint64LE(value), pushData(scriptPubKey));

const serializeOutpoint = (utxo: Utxo) =>
  concatBytes(reverseBytes(hexToBytes(utxo.txid)), uint32LE(utxo.vout));

const serializeInputForTx = (utxo: Utxo) =>
  concatBytes(serializeOutpoint(utxo), Uint8Array.of(0x00), uint32LE(0xffffffff));

const serializeWitness = (signature: Uint8Array, publicKey: Uint8Array) =>
  concatBytes(varInt(2), pushData(signature), pushData(publicKey));

const fetchRecommendedFeeRate = async (baseUrl: string) => {
  try {
    const response = await fetch(`${baseUrl}/v1/fees/recommended`);
    if (!response.ok) throw new Error(`Fee request failed with ${response.status}`);
    const data = await response.json();
    const rate = Number(data?.halfHourFee ?? data?.fastestFee ?? DEFAULT_FEE_RATE);
    return Math.max(1, Math.min(MAX_FEE_RATE, Number.isFinite(rate) ? rate : DEFAULT_FEE_RATE));
  } catch (error) {
    console.warn('Failed to fetch Bitcoin fee estimate, using fallback:', error);
    return DEFAULT_FEE_RATE;
  }
};

const fetchSpendableUtxos = async (baseUrl: string, address: string) => {
  const response = await fetch(`${baseUrl}/address/${address}/utxo`);
  if (!response.ok) {
    throw new Error(`Unable to fetch Bitcoin UTXOs (${response.status})`);
  }

  const utxos = await response.json() as Utxo[];
  return utxos
    .filter((utxo) => Number.isSafeInteger(utxo.value) && utxo.value > 0)
    .sort((a, b) => {
      if (a.status?.confirmed !== b.status?.confirmed) return a.status?.confirmed ? -1 : 1;
      return b.value - a.value;
    });
};

const selectCoins = (utxos: Utxo[], amountSats: number, feeRate: number) => {
  const selected: Utxo[] = [];
  let total = 0;

  for (const utxo of utxos) {
    selected.push(utxo);
    total += utxo.value;

    const feeWithChange = Math.ceil(estimateVbytes(selected.length, 2) * feeRate);
    if (total >= amountSats + feeWithChange) {
      const change = total - amountSats - feeWithChange;
      if (change >= DUST_SATS) {
        return { selected, fee: feeWithChange, change };
      }

      const feeWithoutChange = Math.ceil(estimateVbytes(selected.length, 1) * feeRate);
      if (total >= amountSats + feeWithoutChange) {
        return { selected, fee: total - amountSats, change: 0 };
      }
    }
  }

  throw new Error('Insufficient BTC balance for amount and network fee');
};

const buildSignedP2wpkhTransaction = async ({
  utxos,
  amountSats,
  fee,
  change,
  toAddress,
  changeAddress,
  privateKey,
  network,
}: {
  utxos: Utxo[];
  amountSats: number;
  fee: number;
  change: number;
  toAddress: string;
  changeAddress: string;
  privateKey: Uint8Array;
  network: BitcoinNetwork;
}) => {
  const publicKey = secp.getPublicKey(privateKey, true);
  const publicKeyHash = hash160(publicKey);
  const scriptCode = concatBytes(Uint8Array.of(0x19, 0x76, 0xa9, 0x14), publicKeyHash, Uint8Array.of(0x88, 0xac));
  const recipientOutput = serializeOutput(amountSats, addressToScriptPubKey(toAddress, network));
  const outputs = change >= DUST_SATS
    ? concatBytes(recipientOutput, serializeOutput(change, addressToScriptPubKey(changeAddress, network)))
    : recipientOutput;

  const hashPrevouts = sha256d(concatBytes(...utxos.map(serializeOutpoint)));
  const hashSequence = sha256d(concatBytes(...utxos.map(() => uint32LE(0xffffffff))));
  const hashOutputs = sha256d(outputs);

  const witnesses: Uint8Array[] = [];
  for (const utxo of utxos) {
    const preimage = concatBytes(
      uint32LE(2),
      hashPrevouts,
      hashSequence,
      serializeOutpoint(utxo),
      scriptCode,
      uint64LE(utxo.value),
      uint32LE(0xffffffff),
      hashOutputs,
      uint32LE(0),
      uint32LE(SIGHASH_ALL)
    );
    const signature = secp.sign(sha256d(preimage), privateKey, { prehash: false, format: 'compact' });
    const signatureWithHashType = concatBytes(compactSignatureToDer(signature), Uint8Array.of(SIGHASH_ALL));
    witnesses.push(serializeWitness(signatureWithHashType, publicKey));
  }

  const inputs = concatBytes(...utxos.map(serializeInputForTx));
  const rawTx = concatBytes(
    uint32LE(2),
    Uint8Array.of(0x00, 0x01),
    varInt(utxos.length),
    inputs,
    varInt(change >= DUST_SATS ? 2 : 1),
    outputs,
    ...witnesses,
    uint32LE(0)
  );

  return {
    rawTxHex: bytesToHex(rawTx),
    fee,
  };
};

export async function sendBitcoinWithKey({
  privateKey,
  toAddress,
  amountSats,
  network,
}: {
  privateKey: string;
  toAddress: string;
  amountSats: number;
  network: BitcoinNetwork;
}) {
  const normalizedNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
  const keyBytes = normalizePrivateKey(privateKey);
  const fromAddress = getBitcoinAddressFromPrivateKey(bytesToHex(keyBytes), normalizedNetwork);
  const baseUrl = getMempoolBaseUrl(normalizedNetwork);
  const [feeRate, utxos] = await Promise.all([
    fetchRecommendedFeeRate(baseUrl),
    fetchSpendableUtxos(baseUrl, fromAddress),
  ]);

  if (utxos.length === 0) {
    throw new Error('No spendable BTC UTXOs found for this local wallet');
  }

  const selection = selectCoins(utxos, amountSats, feeRate);
  const { rawTxHex } = await buildSignedP2wpkhTransaction({
    utxos: selection.selected,
    amountSats,
    fee: selection.fee,
    change: selection.change,
    toAddress,
    changeAddress: fromAddress,
    privateKey: keyBytes,
    network: normalizedNetwork,
  });

  const broadcast = await fetch(`${baseUrl}/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: rawTxHex,
  });

  const text = await broadcast.text();
  if (!broadcast.ok) {
    throw new Error(text || `Bitcoin broadcast failed with ${broadcast.status}`);
  }

  return text.trim();
}
