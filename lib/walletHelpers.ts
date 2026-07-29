import { getStxAddress } from '@stacks/wallet-sdk';
import { mnemonicToEntropy, validateMnemonic as isValidMnemonic, mnemonicToSeed, wordlists } from 'bip39';
import { HDKey } from '@scure/bip32';
import { getBitcoinAddressFromPrivateKey, getRootstockAddressFromPrivateKey, getLiquidAddressFromPrivateKey } from './bitcoinWallet';
import { getNostrPublicKeyFromPrivateKey } from './nostr';
import { compressPrivateKey } from '@stacks/transactions';

const supportedWordlists = [wordlists.english, wordlists.spanish, wordlists.portuguese];

function buildWalletFromPrivateKey(mnemonic: string, privateKey: string) {
  const account = {
    stxPrivateKey: privateKey,
    dataPrivateKey: privateKey,
    appsKey: privateKey,
    index: 0,
    salt: '',
  };

  const address = getStxAddress(account, 'mainnet');
  const bitcoinAddress = getBitcoinAddressFromPrivateKey(privateKey, 'mainnet');
  const rootstockAddress = getRootstockAddressFromPrivateKey(privateKey);
  const liquidAddress = getLiquidAddressFromPrivateKey(privateKey, 'mainnet');
  const nostrPublicKey = getNostrPublicKeyFromPrivateKey(privateKey);
  return { mnemonic, privateKey, address, bitcoinAddress, rootstockAddress, liquidAddress, nostrPublicKey };
}

/**
 * Validates a mnemonic and generates a wallet/account.
 * Returns { privateKey, address } or throws on error.
 */
export async function validateAndGenerateWallet(mnemonic: string) {
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const words = normalizedMnemonic.split(' ');
  if (words.length !== 12 && words.length !== 24) {
    throw new Error('Mnemonic must contain either 12 or 24 words.');
  }

  const isValidSupportedMnemonic = supportedWordlists.some((wordlist) =>
    isValidMnemonic(normalizedMnemonic, wordlist)
  );
  if (!isValidSupportedMnemonic) throw new Error('Invalid mnemonic');

  const seed = await mnemonicToSeed(normalizedMnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const path = "m/44'/5757'/0'/0/0";
  const child = root.derive(path);
  if (!child.privateKey) {
    throw new Error('Unable to derive private key from mnemonic.');
  }

  // Stacks wallets use a compressed secp256k1 key. Omitting the compression
  // marker derives a different address from the same recovery phrase.
  const privateKey = compressPrivateKey(child.privateKey);

  return buildWalletFromPrivateKey(normalizedMnemonic, privateKey);
}

/**
 * Restores a wallet from the 24-word phrase produced by privateKeyToMnemonic.
 * This phrase stores the private-key entropy directly instead of acting as a
 * conventional BIP-39 seed for HD derivation.
 */
export function validateAndGenerateWalletFromPrivateKeyMnemonic(mnemonic: string) {
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalizedMnemonic.split(' ').length !== 24) {
    throw new Error('A private-key mnemonic must contain 24 words.');
  }

  const matchingWordlist = supportedWordlists.find((wordlist) =>
    isValidMnemonic(normalizedMnemonic, wordlist)
  );
  if (!matchingWordlist) throw new Error('Invalid mnemonic');

  const secretKey = mnemonicToEntropy(normalizedMnemonic, matchingWordlist);
  return buildWalletFromPrivateKey(normalizedMnemonic, `${secretKey}01`);
}
