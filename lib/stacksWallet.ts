import {
  generateSecretKey,
  generateWallet,
  getStxAddress,
} from '@stacks/wallet-sdk';

/**
 * Creates a Stacks wallet and returns key details.
 * @param password - Optional password for encryption
 * @param network - One of: 'mainnet', 'testnet', 'devnet', 'mocknet'
 */
export async function createStacksAccount(
  password = 'default-password',
  network: 'mainnet' | 'testnet' | 'devnet' | 'mocknet' = 'mainnet'
) {
  try {
    const secretKey = generateSecretKey(); // 24-word mnemonic
    
    if (!secretKey) {
      throw new Error('Failed to generate secret key');
    }
    
    const wallet = await generateWallet({ secretKey, password });
    
    if (!wallet?.accounts?.length) {
      throw new Error('Failed to generate wallet accounts');
    }
    
    const account = wallet.accounts[0];
    
    if (!account.stxPrivateKey) {
      throw new Error('Failed to generate private key');
    }
    
    const address = getStxAddress(account, network);
    
    if (!address) {
      throw new Error('Failed to generate address');
    }

    return {
      address,
      stxPrivateKey: account.stxPrivateKey,
      mnemonic: secretKey,
      encryptedSecretKey: wallet.encryptedSecretKey,
      index: account.index,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create Stacks account');
  }
}
