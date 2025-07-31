import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import { validateMnemonic as isValidMnemonic } from 'bip39';

/**
 * Validates a mnemonic and generates a wallet/account.
 * Returns { privateKey, address } or throws on error.
 */
export async function validateAndGenerateWallet(mnemonic: string) {
  // Input validation
  if (!mnemonic || typeof mnemonic !== 'string') {
    throw new Error('Mnemonic must be a non-empty string');
  }
  
  const trimmedMnemonic = mnemonic.trim();
  if (!trimmedMnemonic) {
    throw new Error('Mnemonic cannot be empty');
  }
  
  if (!isValidMnemonic(trimmedMnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  
  try {
    const wallet = await generateWallet({ 
      secretKey: trimmedMnemonic, 
      password: 'default-password' 
    });
    
    if (!wallet?.accounts?.length) {
      throw new Error('Failed to generate wallet accounts');
    }
    
    const account = wallet.accounts[0];
    if (!account.stxPrivateKey) {
      throw new Error('Failed to generate private key');
    }
    
    const privateKey = account.stxPrivateKey;
    const address = getStxAddress(account, 'mainnet');
    
    if (!address) {
      throw new Error('Failed to generate address');
    }
    
    return { privateKey, address };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate wallet');
  }
}
