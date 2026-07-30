import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  createPortableEncryptedWallet,
  type PortableEncryptedWalletData,
} from '@/lib/encryptedStorage';
import { assertVerifiedEmailToken, VerifiedEmailTokenError } from '@/lib/emailCodeAuth';

type SaveAccountBody = {
  email?: string;
  verifiedEmailToken?: string;
  passkey?: string;
  password?: string;
  passphrase?: string;
  address?: string;
  walletData?: {
    mnemonic?: string;
    stxPrivateKey?: string;
    address?: string;
  };
  encryptedWallet?: Partial<PortableEncryptedWalletData>;
  walletLabel?: string;
};

const hasEncryptedWalletData = (
  wallet: SaveAccountBody['encryptedWallet'],
): wallet is PortableEncryptedWalletData => Boolean(
  wallet?.encryptedMnemonic &&
  wallet.encryptedPrivateKey &&
  wallet.salt &&
  wallet.iv,
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SaveAccountBody;
    const normalizedEmail = body.email?.trim().toLowerCase() ?? '';
    const password = body.passphrase || body.password || '';
    const privateKey = body.passkey || body.walletData?.stxPrivateKey || '';
    const address = body.address || body.walletData?.address || body.encryptedWallet?.address || '';

    if (!normalizedEmail || !password || !privateKey || !address) {
      return NextResponse.json({ error: 'Missing required account data' }, { status: 400 });
    }

    if (body.verifiedEmailToken) {
      assertVerifiedEmailToken(body.verifiedEmailToken, normalizedEmail);
    }

    let encryptedWallet: PortableEncryptedWalletData;
    if (hasEncryptedWalletData(body.encryptedWallet)) {
      encryptedWallet = {
        ...body.encryptedWallet,
        address,
        label: body.encryptedWallet.label || body.walletLabel || 'CHOLO Wallet',
      };
    } else if (body.walletData?.mnemonic && body.walletData.stxPrivateKey) {
      encryptedWallet = createPortableEncryptedWallet(
        {
          privateKey: body.walletData.stxPrivateKey,
          address,
          mnemonic: body.walletData.mnemonic,
          label: body.walletLabel || 'CHOLO Wallet',
        },
        password,
      );
    } else {
      return NextResponse.json({ error: 'Missing encrypted wallet data' }, { status: 400 });
    }

    const passkeyHash = createHash('sha256').update(`${privateKey}${password}`).digest('hex');
    const accountPayload = {
      email: normalizedEmail,
      address,
      passkey: passkeyHash,
      encrypted_private_key: encryptedWallet.encryptedPrivateKey,
      encrypted_mnemonic: encryptedWallet.encryptedMnemonic,
      encryption_salt: encryptedWallet.salt,
      encryption_iv: encryptedWallet.iv,
      encryption_version: encryptedWallet.version || '1.0.0',
      wallet_label: encryptedWallet.label,
      bitcoin_address: encryptedWallet.bitcoinAddress || null,
      rootstock_address: encryptedWallet.rootstockAddress || null,
      liquid_address: encryptedWallet.liquidAddress || null,
    };

    const [addressLookup, emailLookup] = await Promise.all([
      supabaseAdmin
        .from('connected_accounts')
        .select('id,address,email')
        .ilike('address', address)
        .limit(1),
      supabaseAdmin
        .from('connected_accounts')
        .select('id,address,email')
        .ilike('email', normalizedEmail)
        .limit(1),
    ]);

    if (addressLookup.error || emailLookup.error) {
      const lookupError = addressLookup.error || emailLookup.error;
      console.error('Supabase save-account lookup error:', lookupError);
      return NextResponse.json({ error: lookupError?.message || 'Failed to check account' }, { status: 500 });
    }

    const accountByAddress = addressLookup.data?.[0];
    const accountByEmail = emailLookup.data?.[0];
    if (accountByEmail && accountByEmail.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 });
    }

    const saveQuery = accountByAddress
      ? supabaseAdmin.from('connected_accounts').update(accountPayload).eq('id', accountByAddress.id)
      : supabaseAdmin.from('connected_accounts').insert(accountPayload);
    const { error } = await saveQuery;

    if (error) {
      console.error('Supabase save-account error:', error);
      const duplicate = error.code === '23505';
      return NextResponse.json(
        { error: duplicate ? 'Email is already registered.' : error.message },
        { status: duplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({ success: true, email: normalizedEmail, address });
  } catch (error) {
    if (error instanceof VerifiedEmailTokenError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('save-account failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
