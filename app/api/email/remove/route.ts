import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { decodeEmailToken, EmailTokenError } from '@/lib/emailVerification';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const payload = decodeEmailToken(token, 'remove');
    const normalizedEmail = payload.email.toLowerCase();
    const now = new Date().toISOString();

    await supabaseAdmin
      .from('connected_accounts')
      .delete()
      .ilike('address', payload.address)
      .ilike('email', normalizedEmail);

    const { data: profileMatches, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('address', payload.address)
      .limit(1);

    if (profileError) {
      console.error('Failed to load profile during removal:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    if (profileMatches && profileMatches.length > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({
          email: null,
          email_verified: false,
          updated_at: now,
          last_active: now,
        })
        .eq('id', profileMatches[0].id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof EmailTokenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Email removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
