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
