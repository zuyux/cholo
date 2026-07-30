import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAddressFromPublicKey, publicKeyFromSignatureRsv } from '@stacks/transactions';
import { supabaseAdmin } from '@/lib/supabaseClient';

type RecoveryAddresses = {
  address: string;
  bitcoinAddress: string;
  rootstockAddress: string;
  liquidAddress: string;
};

const getRecoveryAddresses = (body: Record<string, unknown>): RecoveryAddresses => ({
  address: typeof body.address === 'string' ? body.address.trim() : '',
  bitcoinAddress: typeof body.bitcoinAddress === 'string' ? body.bitcoinAddress.trim() : '',
  rootstockAddress: typeof body.rootstockAddress === 'string' ? body.rootstockAddress.trim() : '',
  liquidAddress: typeof body.liquidAddress === 'string' ? body.liquidAddress.trim() : '',
});

const buildAddressFilter = (addresses: RecoveryAddresses) => [
  ['address', addresses.address],
  ['bitcoin_address', addresses.bitcoinAddress],
  ['rootstock_address', addresses.rootstockAddress],
  ['liquid_address', addresses.liquidAddress],
]
  .filter((entry): entry is [string, string] => Boolean(entry[1]))
  .map(([column, value]) => `${column}.ilike.${value}`)
  .join(',');

async function findRecoveryAccount(addresses: RecoveryAddresses) {
  const addressFilter = buildAddressFilter(addresses);
  const [accountResult, profileResult] = await Promise.all([
    supabaseAdmin
      .from('connected_accounts')
      .select('id, address, wallet_label')
      .or(addressFilter)
      .limit(1),
    supabaseAdmin
      .from('profiles')
      .select('address, email')
      .or(addressFilter)
      .limit(1),
  ]);

  if (accountResult.error) throw accountResult.error;
  if (profileResult.error) throw profileResult.error;
  if (accountResult.data?.[0]) return accountResult.data[0];

  const profile = profileResult.data?.[0];
  if (!profile) return null;

  // Profiles and password accounts are normally linked by their canonical Stacks
  // address. Email is retained as a fallback for older profile records.
  const profileLinks = [
    profile.address ? `address.ilike.${profile.address}` : '',
    profile.email ? `email.ilike.${profile.email}` : '',
  ].filter(Boolean).join(',');
  if (!profileLinks) return null;

  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('id, address, wallet_label')
    .or(profileLinks)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const addresses = getRecoveryAddresses(body);
    const { address } = addresses;
    if (!address) return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });

    const account = await findRecoveryAccount(addresses);

    if (body.action === 'check') {
      return account
        ? NextResponse.json({ exists: true, walletLabel: account.wallet_label })
        : NextResponse.json({ exists: false, error: 'No CHOLO account was found for this recovery phrase.' }, { status: 404 });
    }

    if (body.action !== 'recover' || !account) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const passkey = typeof body.passkey === 'string' ? body.passkey : '';
    const signature = typeof body.signature === 'string' ? body.signature : '';
    const encryptedWallet = body.encryptedWallet && typeof body.encryptedWallet === 'object' && !Array.isArray(body.encryptedWallet)
      ? body.encryptedWallet as Record<string, unknown>
      : null;
    if (!/^[0-9a-f]{64}$/i.test(passkey) || !signature || !encryptedWallet) {
      return NextResponse.json({ error: 'Invalid recovery data.' }, { status: 400 });
    }

    const required = ['encryptedMnemonic', 'encryptedPrivateKey', 'salt', 'iv'];
    if (required.some((key) => typeof encryptedWallet[key] !== 'string' || !encryptedWallet[key])) {
      return NextResponse.json({ error: 'Invalid encrypted wallet data.' }, { status: 400 });
    }

    const proofPayload = JSON.stringify({
      address,
      passkey,
      encryptedMnemonic: encryptedWallet.encryptedMnemonic,
      encryptedPrivateKey: encryptedWallet.encryptedPrivateKey,
      salt: encryptedWallet.salt,
      iv: encryptedWallet.iv,
    });
    const messageHash = crypto.createHash('sha256').update(proofPayload).digest('hex');
    let proofAddress = '';
    try {
      const publicKey = publicKeyFromSignatureRsv(messageHash, signature);
      proofAddress = getAddressFromPublicKey(publicKey, 'mainnet');
    } catch {
      return NextResponse.json({ error: 'Invalid wallet ownership proof.' }, { status: 403 });
    }
    if (proofAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'The recovery phrase does not control this account.' }, { status: 403 });
    }
    // A match through a Bitcoin/Rootstock/Liquid profile may locate the record,
    // but its canonical account must still be the Stacks address proven above.
    if (account.address.toLowerCase() !== proofAddress.toLowerCase()) {
      return NextResponse.json({ error: 'The recovered wallet does not match this account profile.' }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('connected_accounts')
      .update({
        passkey,
        encrypted_private_key: encryptedWallet.encryptedPrivateKey as string,
        encrypted_mnemonic: encryptedWallet.encryptedMnemonic as string,
        encryption_salt: encryptedWallet.salt as string,
        encryption_iv: encryptedWallet.iv as string,
        encryption_version: typeof encryptedWallet.version === 'string' ? encryptedWallet.version : '1.0.0',
        bitcoin_address: typeof encryptedWallet.bitcoinAddress === 'string' ? encryptedWallet.bitcoinAddress : null,
        rootstock_address: typeof encryptedWallet.rootstockAddress === 'string' ? encryptedWallet.rootstockAddress : null,
        liquid_address: typeof encryptedWallet.liquidAddress === 'string' ? encryptedWallet.liquidAddress : null,
      })
      .eq('id', account.id);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wallet import error:', error);
    return NextResponse.json({ error: 'Unable to import wallet right now.' }, { status: 500 });
  }
}
