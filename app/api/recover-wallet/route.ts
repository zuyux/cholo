import { NextRequest, NextResponse } from 'next/server';
import { encryptedWallets } from '@/lib/wallet-storage';
import { decryptWalletData } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate token format (should be a 64-character hex string - SHA256 hash)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: 'Invalid recovery link format' },
        { status: 400 }
      );
    }

    // Check if token exists in temporary storage
    const encryptedWallet = encryptedWallets.get(token);
    
    if (!encryptedWallet) {
      return NextResponse.json(
        { error: 'Recovery link not found or expired' },
        { status: 404 }
      );
    }

    try {
      // Attempt to decrypt the wallet data with provided password
      const walletData = decryptWalletData(encryptedWallet, password);
      
      // Remove the token after successful recovery (one-time use)
      encryptedWallets.delete(token);
      
      return NextResponse.json({
        success: true,
        wallet: walletData
      });

    } catch (decryptError) {
      console.error('Decryption failed:', decryptError);
      return NextResponse.json(
        { error: 'Invalid password. Please check your password and try again.' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Wallet recovery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
