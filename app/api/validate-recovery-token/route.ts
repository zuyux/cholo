import { NextRequest, NextResponse } from 'next/server';
import { encryptedWallets } from '@/lib/wallet-storage';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    return NextResponse.json({
      valid: true
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
