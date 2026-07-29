import { entropyToMnemonic, generateMnemonic, wordlists } from 'bip39';
import { getStxAddress } from '@stacks/wallet-sdk';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeed } from 'bip39';
import { getBitcoinAddressFromPrivateKey, getRootstockAddressFromPrivateKey, getLiquidAddressFromPrivateKey } from './bitcoinWallet';
import { getNostrPublicKeyFromPrivateKey } from './nostr';

export type MnemonicLanguage = 'en' | 'es' | 'pt';

const MNEMONIC_LANGUAGE_STORAGE_KEY = 'bbox_mnemonic_language';

const mnemonicWordlists: Record<MnemonicLanguage, string[]> = {
  en: wordlists.english,
  es: wordlists.spanish,
  pt: wordlists.portuguese,
};

export function privateKeyToMnemonic(
  privateKey: string,
  language: MnemonicLanguage
): string {
  const normalizedKey = privateKey.trim().replace(/^0x/i, '');
  // Stacks compressed private keys append `01` to the 32-byte secret.
  const secretKey = normalizedKey.length === 66 && normalizedKey.endsWith('01')
    ? normalizedKey.slice(0, 64)
    : normalizedKey;

  if (!/^[0-9a-fA-F]{64}$/.test(secretKey)) {
    throw new Error('Private key must be a 32-byte hex value, optionally followed by the Stacks compression marker');
  }

  return entropyToMnemonic(secretKey.toLowerCase(), mnemonicWordlists[language]);
}

export function getDeviceMnemonicLanguage(): MnemonicLanguage {
  if (typeof navigator === 'undefined') return 'en';

  try {
    const savedLanguage = window.localStorage.getItem(MNEMONIC_LANGUAGE_STORAGE_KEY);
    if (savedLanguage === 'en' || savedLanguage === 'es' || savedLanguage === 'pt') {
      return savedLanguage;
    }
  } catch (error) {
    console.warn('Unable to read mnemonic language preference:', error);
  }

  const deviceLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const locale of deviceLanguages) {
    const language = locale?.toLowerCase().split('-')[0];
    if (language === 'en' || language === 'es' || language === 'pt') {
      return language;
    }
  }

  return 'en';
}

export function saveMnemonicLanguagePreference(language: MnemonicLanguage): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(MNEMONIC_LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Unable to save mnemonic language preference:', error);
  }
}

/**
 * Creates a Stacks wallet and returns key details.
 * @param network - One of: 'mainnet', 'testnet', 'devnet', 'mocknet'
 */
export async function createStacksAccount(
  network: 'mainnet' | 'testnet' | 'devnet' | 'mocknet' = (process.env.NEXT_PUBLIC_STACKS_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'testnet',
  mnemonicLanguage: MnemonicLanguage = getDeviceMnemonicLanguage()
) {
  try {
    // Match the device language when supported, with English as the default.
    const mnemonic = generateMnemonic(128, undefined, mnemonicWordlists[mnemonicLanguage]);
    
    // Convert mnemonic to seed
    const seed = await mnemonicToSeed(mnemonic);
    
    // Create HD wallet from seed
    const root = HDKey.fromMasterSeed(seed);
    
    // Derive the account using standard Stacks derivation path
    const path = "m/44'/5757'/0'/0/0"; // Stacks derivation path
    const child = root.derive(path);
    
    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }
    
    // Create account object compatible with getStxAddress
    const privateKeyHex = Array.from(child.privateKey)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const account = {
      stxPrivateKey: privateKeyHex,
      dataPrivateKey: privateKeyHex,
      appsKey: privateKeyHex,
      index: 0,
      salt: '', // Add required salt property
    };
    
    const address = getStxAddress(account, network);
    const bitcoinAddress = getBitcoinAddressFromPrivateKey(
      privateKeyHex,
      network === 'testnet' ? 'testnet' : 'mainnet'
    );
    const rootstockAddress = getRootstockAddressFromPrivateKey(privateKeyHex);
    const liquidAddress = getLiquidAddressFromPrivateKey(privateKeyHex, network === 'testnet' ? 'testnet' : 'mainnet');
    const nostrPublicKey = getNostrPublicKeyFromPrivateKey(privateKeyHex);

    return {
      address,
      stxPrivateKey: account.stxPrivateKey,
      bitcoinAddress,
      rootstockAddress,
      liquidAddress,
      nostrPublicKey,
      mnemonic,
      encryptedSecretKey: '',
      index: 0,
    };
  } catch (error) {
    console.error('Error creating Stacks account:', error);
    throw new Error('Failed to create Stacks account');
  }
}
