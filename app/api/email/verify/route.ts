import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { decodeEmailToken, EmailTokenError } from '@/lib/emailVerification';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const payload = decodeEmailToken(token, 'verify');
    const normalizedEmail = payload.email.toLowerCase();
    const now = new Date().toISOString();

    const { data: profileMatches, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('address', payload.address)
      .limit(1);

    if (profileError) {
      console.error('Failed to load profile for verification:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    if (profileMatches && profileMatches.length > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({
          email: normalizedEmail,
          email_verified: true,
          updated_at: now,
          last_active: now,
        })
        .eq('id', profileMatches[0].id);
    } else {
      await supabaseAdmin
        .from('profiles')
        .insert([
          {
            address: payload.address,
            email: normalizedEmail,
            email_verified: true,
            created_at: now,
            updated_at: now,
            last_active: now,
          }
        ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof EmailTokenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
