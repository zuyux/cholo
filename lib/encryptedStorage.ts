/**
 * Encrypted Storage Utility for Internal Wallet Sessions
 * Provides secure storage for private keys and mnemonics with passphrase encryption
 */

import CryptoJS from 'crypto-js';

export interface EncryptedWalletData {
  encryptedMnemonic: string;
  encryptedPrivateKey: string;
  bitcoinAddress?: string;
  rootstockAddress?: string;
  liquidAddress?: string;
  nostrPublicKey?: string;
  address: string;
  label: string;
  salt: string;
  iv: string;
  createdAt: number;
  lastAccessed: number;
  version: string;
}

export interface WalletData {
  mnemonic: string;
  privateKey: string;
  bitcoinAddress?: string;
  rootstockAddress?: string;
  liquidAddress?: string;
  nostrPublicKey?: string;
  address: string;
  label: string;
}

export type EncryptedWalletErrorCode =
  | 'not_found'
  | 'corrupt_data'
  | 'decrypt_failed'
  | 'missing_private_key';

export class EncryptedWalletError extends Error {
  code: EncryptedWalletErrorCode;

  constructor(code: EncryptedWalletErrorCode, message: string) {
    super(message);
    this.name = 'EncryptedWalletError';
    this.code = code;
  }
}

export type WalletAddressUpdates = Partial<Pick<WalletData, 'bitcoinAddress' | 'rootstockAddress' | 'liquidAddress' | 'nostrPublicKey'>>;

export interface PortableEncryptedWalletData {
  encryptedMnemonic: string;
  encryptedPrivateKey: string;
  bitcoinAddress?: string;
  rootstockAddress?: string;
  liquidAddress?: string;
  nostrPublicKey?: string;
  address: string;
  label: string;
  salt: string;
  iv: string;
  version?: string;
}

// Backward-compatible name used by the existing account persistence endpoint.
export const createPortableEncryptedWallet = createPortableEncryptedWalletData;

export interface SessionConfig {
  sessionTimeout: number; // in minutes
  autoLock: boolean;
  requirePassphraseOnTransaction: boolean;
}

const STORAGE_KEY = 'cholo_encrypted_session';
const CONFIG_KEY = 'cholo_session_config';
const SESSION_LOCK_KEY = 'cholo_session_locked';
const CURRENT_VERSION = '1.0.0';

// Default session configuration
const DEFAULT_CONFIG: SessionConfig = {
  sessionTimeout: 60, // 60 minutes (1 hour)
  autoLock: true,
  requirePassphraseOnTransaction: true,
};

/**
 * Generate a random salt for encryption
 */
function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128/8).toString();
}

/**
 * Generate a random initialization vector
 */
function generateIV(): string {
  return CryptoJS.lib.WordArray.random(128/8).toString();
}

/**
 * Derive encryption key from passphrase using PBKDF2
 */
function deriveKey(passphrase: string, salt: string): string {
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256/32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256
  }).toString();
}

/**
 * Encrypt data using AES-256-CBC
 */
function encryptData(data: string, key: string, iv: string): string {
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
}

/**
 * Decrypt data using AES-256-CBC
 */
function decryptData(encryptedData: string, key: string, iv: string): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function buildEncryptedWalletData(walletData: WalletData, passphrase: string): EncryptedWalletData {
  const salt = generateSalt();
  const iv = generateIV();
  const key = deriveKey(passphrase, salt);
  const encryptedMnemonic = encryptData(walletData.mnemonic, key, iv);
  const encryptedPrivateKey = encryptData(walletData.privateKey, key, iv);
  const timestamp = Date.now();

  return {
    encryptedMnemonic,
    encryptedPrivateKey,
    bitcoinAddress: walletData.bitcoinAddress,
    rootstockAddress: walletData.rootstockAddress,
    liquidAddress: walletData.liquidAddress,
    nostrPublicKey: walletData.nostrPublicKey,
    address: walletData.address,
    label: walletData.label,
    salt,
    iv,
    createdAt: timestamp,
    lastAccessed: timestamp,
    version: CURRENT_VERSION,
  };
}

/** Build a server-portable encrypted wallet without writing secrets to storage. */
export function createPortableEncryptedWalletData(
  walletData: WalletData,
  passphrase: string
): PortableEncryptedWalletData {
  return toPortableEncryptedWalletData(buildEncryptedWalletData(walletData, passphrase));
}

/**
 * Validate passphrase strength
 */
export function validatePassphraseStrength(passphrase: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (passphrase.length < 8) {
    feedback.push('Passphrase must be at least 8 characters long');
  } else if (passphrase.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  if (/[A-Z]/.test(passphrase)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/[a-z]/.test(passphrase)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[0-9]/.test(passphrase)) score += 1;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(passphrase)) score += 1;
  else feedback.push('Include special characters');

  if (passphrase.length >= 16) score += 1;

  const isValid = score >= 4 && passphrase.length >= 8;

  return { isValid, score, feedback };
}

/**
 * Store encrypted wallet data
 */
export async function storeEncryptedWallet(
  walletData: WalletData,
  passphrase: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Storage is only available in browser environment');
  }

  // Validate passphrase
  const { isValid, feedback } = validatePassphraseStrength(passphrase);
  if (!isValid) {
    throw new Error(`Weak passphrase: ${feedback.join(', ')}`);
  }

  const encryptedWalletData = buildEncryptedWalletData(walletData, passphrase);

  // Delete any previous session before creating a new one
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_LOCK_KEY);

  // Store encrypted data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedWalletData));

  // Store session config (always set to default for new session)
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));

  // Dispatch event for UI updates
  window.dispatchEvent(new Event('cholo-encrypted-session-created'));
}

/**
 * Retrieve and decrypt wallet data
 */
export async function retrieveEncryptedWallet(passphrase: string): Promise<WalletData | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) {
    throw new EncryptedWalletError(
      'not_found',
      'No encrypted wallet is stored in this browser. Reconnect or restore your wallet before trying again.'
    );
  }

  let encryptedData: EncryptedWalletData;
  try {
    encryptedData = JSON.parse(encryptedDataStr) as EncryptedWalletData;
  } catch (error) {
    console.error('Encrypted wallet data is not valid JSON:', error);
    throw new EncryptedWalletError(
      'corrupt_data',
      'The saved wallet data is corrupted and cannot be read. Restore or reconnect your wallet.'
    );
  }

  if (
    !encryptedData ||
    typeof encryptedData.encryptedMnemonic !== 'string' ||
    typeof encryptedData.encryptedPrivateKey !== 'string' ||
    typeof encryptedData.salt !== 'string' ||
    typeof encryptedData.iv !== 'string'
  ) {
    throw new EncryptedWalletError(
      'corrupt_data',
      'The saved wallet data is incomplete. Restore or reconnect your wallet.'
    );
  }

  try {
    const key = deriveKey(passphrase, encryptedData.salt);

    // Decrypt sensitive data
    const mnemonic = decryptData(encryptedData.encryptedMnemonic, key, encryptedData.iv);
    const privateKey = decryptData(encryptedData.encryptedPrivateKey, key, encryptedData.iv);

    // Verify decryption success (check if decrypted data looks valid)
    if (!mnemonic && !privateKey) {
      throw new EncryptedWalletError(
        'decrypt_failed',
        'This password did not decrypt the saved wallet. If the password is correct, the local wallet data may be corrupted or from another wallet.'
      );
    }

    if (!privateKey) {
      throw new EncryptedWalletError(
        'missing_private_key',
        'Wallet unlocked, but no private key was stored for this local account. Restore or reconnect the wallet to generate receive addresses.'
      );
    }

    if (!mnemonic) {
      throw new EncryptedWalletError(
        'corrupt_data',
        'Wallet decrypted, but the recovery phrase is missing from local storage. Restore or reconnect your wallet.'
      );
    }

    // Update last accessed time
    encryptedData.lastAccessed = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedData));

    // Dispatch event for session activity
    window.dispatchEvent(new Event('cholo-session-accessed'));

    return {
      mnemonic,
      privateKey,
      bitcoinAddress: encryptedData.bitcoinAddress,
      rootstockAddress: encryptedData.rootstockAddress,
      liquidAddress: encryptedData.liquidAddress,
      nostrPublicKey: encryptedData.nostrPublicKey,
      address: encryptedData.address,
      label: encryptedData.label,
    };
  } catch (error) {
    if (error instanceof EncryptedWalletError) {
      throw error;
    }

    console.error('Failed to decrypt wallet data:', error);
    throw new EncryptedWalletError(
      'decrypt_failed',
      'This password did not decrypt the saved wallet. If the password is correct, the local wallet data may be corrupted or from another wallet.'
    );
  }
}

/**
 * Check if encrypted wallet exists
 */
export function hasEncryptedWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEY);
}

/**
 * Get wallet info without decrypting
 */
export function getWalletInfo(): { address: string; label: string; createdAt: number; bitcoinAddress?: string; rootstockAddress?: string; liquidAddress?: string; nostrPublicKey?: string } | null {
  if (typeof window === 'undefined') return null;

  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) return null;

  try {
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);
    return {
      address: encryptedData.address,
      label: encryptedData.label,
      bitcoinAddress: encryptedData.bitcoinAddress,
      rootstockAddress: encryptedData.rootstockAddress,
      liquidAddress: encryptedData.liquidAddress,
      nostrPublicKey: encryptedData.nostrPublicKey,
      createdAt: encryptedData.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Lock the session
 */
export function lockSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(SESSION_LOCK_KEY, 'true');
  window.dispatchEvent(new Event('cholo-session-locked'));
}

/**
 * Check if session is locked
 */
export function isSessionLocked(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SESSION_LOCK_KEY) === 'true';
}

/**
 * Unlock the session (remove lock flag)
 */
export function unlockSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(SESSION_LOCK_KEY);
  window.dispatchEvent(new Event('cholo-session-unlocked'));
}

/**
 * Update last accessed time to extend session
 */
export function extendSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) return false;

  try {
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);
    
    // Update last accessed time
    encryptedData.lastAccessed = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedData));
    
    // Dispatch event for session activity
    window.dispatchEvent(new Event('cholo-session-accessed'));
    
    return true;
  } catch (error) {
    console.error('Failed to extend session:', error);
    return false;
  }
}

/**
 * Check if session has expired based on configuration
 */
export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return true;

  const configStr = localStorage.getItem(CONFIG_KEY);
  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);

  if (!configStr || !encryptedDataStr) return true;

  try {
    const config: SessionConfig = JSON.parse(configStr);
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);

    if (!config.autoLock) return false;

    const now = Date.now();
    const timeoutMinutes = typeof config.sessionTimeout === 'number' ? config.sessionTimeout : DEFAULT_CONFIG.sessionTimeout;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeDiff = now - encryptedData.lastAccessed;
    const isExpired = timeDiff > timeoutMs;

    return isExpired;
  } catch {
    return true;
  }
}/**
 * Auto-lock session if expired
 */
export function autoLockIfExpired(): boolean {
  if (isSessionExpired() && !isSessionLocked()) {
    lockSession();
    return true;
  }
  return false;
}

/**
 * Update session configuration
 */
export function updateSessionConfig(config: Partial<SessionConfig>): void {
  if (typeof window === 'undefined') return;

  const currentConfigStr = localStorage.getItem(CONFIG_KEY);
  const currentConfig = currentConfigStr ? JSON.parse(currentConfigStr) : DEFAULT_CONFIG;
  
  const newConfig = { ...currentConfig, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
  
  window.dispatchEvent(new Event('cholo-session-config-updated'));
}

/**
 * Get current session configuration
 */
export function getSessionConfig(): SessionConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;

  const configStr = localStorage.getItem(CONFIG_KEY);
  return configStr ? JSON.parse(configStr) : DEFAULT_CONFIG;
}

/**
 * Reset session config to default values
 */
export function resetSessionConfig(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
}

/**
 * Delete encrypted wallet and clear all session data
 */
export function deleteWallet(address: string) {
  // Clear the session data
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_LOCK_KEY);
  localStorage.removeItem(CONFIG_KEY);

  // Remove the specific wallet and config
  localStorage.removeItem(`encrypted_wallet_${address}`);
  localStorage.removeItem(`wallet_config_${address}`);

  window.dispatchEvent(new Event('cholo-session-deleted'));
}

/**
 * Change wallet passphrase
 */
export async function changeWalletPassphrase(
  oldPassphrase: string,
  newPassphrase: string
): Promise<void> {
  // First retrieve with old passphrase
  const walletData = await retrieveEncryptedWallet(oldPassphrase);
  if (!walletData) {
    throw new Error('Failed to decrypt wallet with current passphrase');
  }

  // Store with new passphrase
  await storeEncryptedWallet(walletData, newPassphrase);
  
  window.dispatchEvent(new Event('cholo-passphrase-changed'));
}

export function getStoredEncryptedWallet(): EncryptedWalletData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) {
    return null;
  }

  try {
    return JSON.parse(encryptedDataStr) as EncryptedWalletData;
  } catch {
    return null;
  }
}

export function updateEncryptedWalletAddresses(updates: WalletAddressUpdates): WalletAddressUpdates {
  if (typeof window === 'undefined') {
    throw new Error('Storage is only available in browser environment');
  }

  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) {
    throw new Error('No encrypted wallet found');
  }

  try {
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);
    const nextData: EncryptedWalletData = {
      ...encryptedData,
      ...updates,
      lastAccessed: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));

    const sessionData = localStorage.getItem('cholo_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        localStorage.setItem('cholo_session', JSON.stringify({
          ...session,
          bitcoinAddress: nextData.bitcoinAddress,
          rootstockAddress: nextData.rootstockAddress,
          liquidAddress: nextData.liquidAddress,
          nostrPublicKey: nextData.nostrPublicKey,
        }));
      } catch {
        // Session compatibility data is best-effort; the encrypted wallet remains the source of truth.
      }
    }

    window.dispatchEvent(new Event('cholo-encrypted-wallet-updated'));
    return updates;
  } catch (error) {
    console.error('Failed to update encrypted wallet addresses:', error);
    throw new Error('Unable to update wallet addresses');
  }
}

export function toPortableEncryptedWalletData(data: EncryptedWalletData): PortableEncryptedWalletData {
  return {
    encryptedMnemonic: data.encryptedMnemonic,
    encryptedPrivateKey: data.encryptedPrivateKey,
    bitcoinAddress: data.bitcoinAddress,
    rootstockAddress: data.rootstockAddress,
    liquidAddress: data.liquidAddress,
    nostrPublicKey: data.nostrPublicKey,
    address: data.address,
    label: data.label,
    salt: data.salt,
    iv: data.iv,
    version: data.version,
  };
}

export function decryptPortableEncryptedWallet(
  payload: PortableEncryptedWalletData,
  passphrase: string
): WalletData {
  const key = deriveKey(passphrase, payload.salt);
  const mnemonic = decryptData(payload.encryptedMnemonic, key, payload.iv);
  const privateKey = decryptData(payload.encryptedPrivateKey, key, payload.iv);

  if (!mnemonic || !privateKey) {
    throw new Error('Failed to decrypt wallet data');
  }

  return {
    mnemonic,
    privateKey,
    bitcoinAddress: payload.bitcoinAddress,
    rootstockAddress: payload.rootstockAddress,
    liquidAddress: payload.liquidAddress,
    nostrPublicKey: payload.nostrPublicKey,
    address: payload.address,
    label: payload.label,
  };
}

/**
 * Check if session is currently active (unlocked and not expired)
 */
export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  
  return hasEncryptedWallet() && !isSessionLocked() && !isSessionExpired();
}

/**
 * Attempt to restore session from localStorage
 * This checks if there's valid session data that can be restored without a passphrase
 */
export function tryRestoreSession(): WalletData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check if session is active
    if (!isSessionActive()) return null;
    
    // Try to get session data from localStorage
    const sessionData = localStorage.getItem('cholo_session');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (!session.address || !session.encrypted) return null;
      
      const walletInfo = getWalletInfo();
      if (!walletInfo || walletInfo.address !== session.address) return null;
      
      return {
        mnemonic: '',
        privateKey: '',
        bitcoinAddress: walletInfo.bitcoinAddress,
        rootstockAddress: walletInfo.rootstockAddress,
        liquidAddress: walletInfo.liquidAddress,
        address: session.address,
        label: session.label || 'Encrypted Wallet',
      };
    }

    // Fallback: if a valid encrypted wallet exists and it is not locked, restore minimal session data from wallet info.
    if (isSessionActive()) {
      const walletInfo = getWalletInfo();
      if (!walletInfo) return null;
      return {
        mnemonic: '',
        privateKey: '',
        bitcoinAddress: walletInfo.bitcoinAddress,
        rootstockAddress: walletInfo.rootstockAddress,
        liquidAddress: walletInfo.liquidAddress,
        address: walletInfo.address,
        label: walletInfo.label || 'Encrypted Wallet',
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to restore session:', error);
    return null;
  }
}

/**
 * Get session status information
 */
export function getSessionStatus(): {
  hasWallet: boolean;
  isLocked: boolean;
  isExpired: boolean;
  isActive: boolean;
} {
  const hasWallet = hasEncryptedWallet();
  const isLocked = isSessionLocked();
  const isExpired = isSessionExpired();
  const isActive = hasWallet && !isLocked && !isExpired;
  
  return {
    hasWallet,
    isLocked,
    isExpired,
    isActive,
  };
}

/**
 * Verify passphrase without full decryption (for quick auth checks)
 */
export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  try {
    const walletData = await retrieveEncryptedWallet(passphrase);
    return !!walletData;
  } catch {
    return false;
  }
}
