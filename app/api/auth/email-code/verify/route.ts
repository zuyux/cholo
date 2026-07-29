import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_PURPOSE,
  createVerifiedEmailToken,
  hashEmailCode,
  isEmailCodePurpose,
} from '@/lib/emailCodeAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { email, code, purpose: rawPurpose } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    const purpose = isEmailCodePurpose(rawPurpose) ? rawPurpose : EMAIL_CODE_PURPOSE;

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json({ error: 'Enter the 6-digit verification code' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('email_verification_codes')
      .select('id, code_hash, attempts, consumed_at, expires_at')
      .ilike('email', normalizedEmail)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to load email verification code:', error);
      return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
    }

    const record = data?.[0];
    if (!record) {
      return NextResponse.json({ error: 'Verification code not found. Request a new code.' }, { status: 400 });
    }

    if (record.consumed_at) {
      return NextResponse.json({ error: 'Verification code was already used. Request a new code.' }, { status: 400 });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Verification code expired. Request a new code.' }, { status: 410 });
    }

    if (record.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    const expectedHash = hashEmailCode(normalizedEmail, normalizedCode, purpose);
    if (record.code_hash !== expectedHash) {
      await supabaseAdmin
        .from('email_verification_codes')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);

      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    await supabaseAdmin
      .from('email_verification_codes')
      .update({
        attempts: record.attempts + 1,
        consumed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    return NextResponse.json({
      success: true,
      verifiedEmailToken: createVerifiedEmailToken(normalizedEmail, purpose),
    });
  } catch (error) {
    console.error('Email code verification failed:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
