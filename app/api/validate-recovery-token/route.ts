import { NextRequest, NextResponse } from 'next/server';
import { encryptedWallets } from '../send-encrypted-wallet/route';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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
