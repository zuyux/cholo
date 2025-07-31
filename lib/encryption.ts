import CryptoJS from 'crypto-js';

export interface EncryptedWallet {
  encryptedData: string;
  salt: string;
  iv: string;
}

export interface WalletData {
  stxPrivateKey: string;
  address: string;
  mnemonic: string;
}

/**
 * Encrypts wallet data with a password
 */
export function encryptWalletData(walletData: WalletData, password: string): EncryptedWallet {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }

  // Generate random salt and IV
  const salt = CryptoJS.lib.WordArray.random(256/8);
  const iv = CryptoJS.lib.WordArray.random(128/8);
  
  // Derive key from password and salt
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  });
  
  // Encrypt the wallet data
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(walletData), key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    encryptedData: encrypted.toString(),
    salt: salt.toString(),
    iv: iv.toString()
  };
}

/**
 * Decrypts wallet data with a password
 */
export function decryptWalletData(encryptedWallet: EncryptedWallet, password: string): WalletData {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }

  try {
    // Recreate salt and IV from strings
    const salt = CryptoJS.enc.Hex.parse(encryptedWallet.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedWallet.iv);
    
    // Derive the same key from password and salt
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    
    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(encryptedWallet.encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Invalid password or corrupted data');
    }
    
    return JSON.parse(decryptedString);
  } catch {
    throw new Error('Failed to decrypt wallet data. Invalid password or corrupted data.');
  }
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a secure token for the email link
 */
export function generateSecureToken(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}
