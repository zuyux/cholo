import { NextRequest, NextResponse } from 'next/server';

import { sendAccountActivityNotification } from '@/lib/accountActivityNotifications';

const WALLET_PROVIDERS = new Set([
  'leather',
  'xverse',
  'alby',
  'nostria',
  'okx',
  'walletconnect',
]);

export async function POST(request: NextRequest) {
  try {
    const { address, provider } = await request.json();

    if (
      typeof address !== 'string' ||
      !address.trim() ||
      typeof provider !== 'string' ||
      !WALLET_PROVIDERS.has(provider)
    ) {
      return NextResponse.json({ error: 'Invalid wallet sign-in data' }, { status: 400 });
    }

    await sendAccountActivityNotification({
      type: 'wallet-sign-in',
      address: address.trim(),
      provider,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send wallet sign-in notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
