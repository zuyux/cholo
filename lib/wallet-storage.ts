import { EncryptedWallet } from './encryption';

// In-memory storage for encrypted private keys (temporary, for recovery flow)
// Key: hashed private key (token), Value: encrypted private key data
export const encryptedWallets = new Map<string, EncryptedWallet>();
