import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabaseClient';

type AddressUpdates = {
  bitcoin_address?: string | null;
  rootstock_address?: string | null;
  liquid_address?: string | null;
};

function cleanAddress(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || null;
}

function buildAddressUpdates(body: Record<string, unknown>): AddressUpdates {
  const updates: AddressUpdates = {};
  const bitcoinAddress = cleanAddress(body.bitcoinAddress);
  const rootstockAddress = cleanAddress(body.rootstockAddress);
  const liquidAddress = cleanAddress(body.liquidAddress);

  if (bitcoinAddress !== undefined) updates.bitcoin_address = bitcoinAddress;
  if (rootstockAddress !== undefined) updates.rootstock_address = rootstockAddress;
  if (liquidAddress !== undefined) updates.liquid_address = liquidAddress;

  return updates;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid wallet address payload' }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const address = typeof payload.address === 'string' ? payload.address.trim() : '';
    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const addressUpdates = buildAddressUpdates(payload);
    if (Object.keys(addressUpdates).length === 0) {
      return NextResponse.json({ error: 'At least one receive address is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const [accountResult, profileResult] = await Promise.all([
      supabaseAdmin
        .from('connected_accounts')
        .update(addressUpdates)
        .ilike('address', address)
        .select('address, bitcoin_address, rootstock_address, liquid_address'),
      supabaseAdmin
        .from('profiles')
        .upsert([{ address, ...addressUpdates, updated_at: now, last_active: now }], { onConflict: 'address' })
        .select('address, bitcoin_address, rootstock_address, liquid_address'),
    ]);

    if (accountResult.error || profileResult.error) {
      console.error('Failed to save wallet receive addresses:', {
        connectedAccounts: accountResult.error,
        profiles: profileResult.error,
      });

      return NextResponse.json(
        {
          error: 'Generated address locally, but failed to save it to Supabase.',
          details: accountResult.error?.message || profileResult.error?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connectedAccounts: accountResult.data ?? [],
      profiles: profileResult.data ?? [],
    });
  } catch (error) {
    console.error('Unexpected wallet address save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
