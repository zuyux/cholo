import { NextRequest, NextResponse } from 'next/server';
import { encryptedWallets } from '../send-encrypted-wallet/route';
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

    // Check if token exists
    const encryptedWallet = encryptedWallets.get(token);
    
    if (!encryptedWallet) {
      return NextResponse.json(
        { error: 'Invalid recovery link' },
        { status: 404 }
      );
    }

    try {
      // Attempt to decrypt the wallet data
      const walletData = decryptWalletData(encryptedWallet, password);
      
      // Remove the token after successful recovery (one-time use)
      encryptedWallets.delete(token);
      
      return NextResponse.json({
        success: true,
        wallet: walletData
      });

    } catch {
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
