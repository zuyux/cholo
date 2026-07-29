import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { createPortableEncryptedWallet } from '@/lib/encryptedStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, passkey, password, address, walletData, walletLabel } = body as {
      email?: string;
      passkey?: string;
      password?: string;
      address?: string;
      walletData?: {
        mnemonic?: string;
        stxPrivateKey?: string;
        address?: string;
      };
      walletLabel?: string;
    };

    if (!email || !passkey || !password || !address || !walletData?.mnemonic || !walletData?.stxPrivateKey) {
      return NextResponse.json({ error: 'Missing required account data' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passkeyHash = createHash('sha256').update(`${passkey}${password}`).digest('hex');
    const encryptedWallet = createPortableEncryptedWallet(
      { privateKey: walletData.stxPrivateKey, address: walletData.address || address, mnemonic: walletData.mnemonic, label: walletLabel ?? '4V4 Wallet' },
      password,
    );

    const { error } = await supabaseAdmin.from('connected_accounts').upsert({
      email: normalizedEmail,
      address,
      passkey: passkeyHash,
      encrypted_private_key: encryptedWallet.encryptedPrivateKey,
      encrypted_mnemonic: encryptedWallet.encryptedMnemonic,
      encryption_salt: encryptedWallet.salt,
      encryption_iv: encryptedWallet.iv,
      encryption_version: '1.0.0',
      wallet_label: walletLabel ?? '4V4 Wallet',
      bitcoin_address: null,
      rootstock_address: null,
      liquid_address: null,
    }, { onConflict: 'address' });

    if (error) {
      console.error('Supabase save-account error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, email: normalizedEmail, address });
  } catch (error) {
    console.error('save-account failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
