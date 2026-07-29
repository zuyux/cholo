import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('email,address')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Recovery link request accepted',
      found: !!data,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('wallet-recovery send-link failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
