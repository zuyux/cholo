import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { decryptPortableEncryptedWallet, type PortableEncryptedWalletData } from '@/lib/encryptedStorage';
import { supabaseAdmin } from '@/lib/supabaseClient';

interface ConnectedAccountRecord {
  email: string;
  address: string;
  passkey: string;
  encrypted_private_key: string | null;
  encrypted_mnemonic: string | null;
  encryption_salt: string | null;
  encryption_iv: string | null;
  encryption_version: string | null;
  wallet_label: string | null;
  bitcoin_address: string | null;
  rootstock_address: string | null;
  liquid_address: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json();
    const suppliedIdentifier = identifier ?? '';

    if (typeof suppliedIdentifier !== 'string' || !suppliedIdentifier.trim()) {
      return NextResponse.json({ error: 'Username or email is required' }, { status: 400 });
    }

    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const normalizedIdentifier = suppliedIdentifier.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier);

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('email,address,passkey,encrypted_private_key,encrypted_mnemonic,encryption_salt,encryption_iv,encryption_version,wallet_label,bitcoin_address,rootstock_address,liquid_address')
      .ilike(isEmail ? 'email' : 'address', normalizedIdentifier)
      .maybeSingle<ConnectedAccountRecord>();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid username, email, or password' }, { status: 401 });
    }

    if (!data.encrypted_private_key || !data.encrypted_mnemonic || !data.encryption_salt || !data.encryption_iv) {
      return NextResponse.json({ error: 'This account does not have an encrypted wallet backup stored' }, { status: 401 });
    }

    const payload: PortableEncryptedWalletData = {
      encryptedMnemonic: data.encrypted_mnemonic,
      encryptedPrivateKey: data.encrypted_private_key,
      address: data.address,
      label: data.wallet_label ?? '4V4 Wallet',
      salt: data.encryption_salt,
      iv: data.encryption_iv,
      version: data.encryption_version ?? '1.0.0',
    };

    let wallet;
    try {
      wallet = decryptPortableEncryptedWallet(payload, password);
    } catch {
      return NextResponse.json({ error: 'Invalid username, email, or password' }, { status: 401 });
    }

    const passkeyHash = createHash('sha256').update(wallet.privateKey + password).digest('hex');
    if (passkeyHash !== data.passkey) {
      return NextResponse.json({ error: 'Invalid username, email, or password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      wallet: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
        label: wallet.label,
      },
      account: {
        email: data.email,
        address: data.address,
        walletLabel: data.wallet_label ?? '4V4 Wallet',
      },
    });
  } catch (error) {
    console.error('Account login lookup failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
