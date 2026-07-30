import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await context.params;

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('address', address)
      .limit(1)
      .maybeSingle();

    // A missing profile is a normal state for a newly connected wallet.
    if (error || !data) {
      if (error) {
        console.warn(`Profile lookup failed for ${address}:`, error.message);
      }
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    return NextResponse.json({ profile: data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected profile lookup error:', error);
    return NextResponse.json({ profile: null }, { status: 200 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await context.params;
    const body = await request.json().catch(() => null);
    const username = typeof body?.username === 'string'
      ? body.username.trim().replace(/^@/, '')
      : '';

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters and use only letters, numbers, dots, dashes, or underscores.' },
        { status: 400 },
      );
    }

    const { data: usernameMatch, error: usernameLookupError } = await supabaseAdmin
      .from('profiles')
      .select('address')
      .ilike('username', username)
      .limit(1)
      .maybeSingle();

    if (usernameLookupError) {
      return NextResponse.json({ error: usernameLookupError.message }, { status: 500 });
    }

    if (usernameMatch && usernameMatch.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: existing, error: profileLookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('address', address)
      .limit(1)
      .maybeSingle();

    if (profileLookupError) {
      return NextResponse.json({ error: profileLookupError.message }, { status: 500 });
    }

    const result = existing
      ? await supabaseAdmin
          .from('profiles')
          .update({ username, updated_at: now, last_active: now })
          .eq('id', existing.id)
          .select('*')
          .single()
      : await supabaseAdmin
          .from('profiles')
          .insert({ address, username, updated_at: now, last_active: now })
          .select('*')
          .single();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: result.data });
  } catch (error) {
    console.error('Profile username update failed:', error);
    return NextResponse.json({ error: 'Failed to update username.' }, { status: 500 });
  }
}
