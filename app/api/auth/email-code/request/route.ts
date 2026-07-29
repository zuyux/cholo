import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { sendEmail, emailTemplates } from '@/lib/email';
import {
  EMAIL_CODE_PURPOSE,
  PROFILE_EMAIL_CODE_PURPOSE,
  EMAIL_CODE_TTL_MINUTES,
  createEmailCode,
  hashEmailCode,
  isEmailCodePurpose,
} from '@/lib/emailCodeAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { email, purpose: rawPurpose, address: rawAddress } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const purpose = isEmailCodePurpose(rawPurpose) ? rawPurpose : EMAIL_CODE_PURPOSE;
    const address = typeof rawAddress === 'string' ? rawAddress.trim() : '';

    const [profilesResult, connectedAccountsResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, address')
        .ilike('email', normalizedEmail)
        .limit(1),
      supabaseAdmin
        .from('connected_accounts')
        .select('address')
        .ilike('email', normalizedEmail)
        .limit(1),
    ]);

    if (profilesResult.error || connectedAccountsResult.error) {
      console.error('Email code duplicate check failed:', profilesResult.error || connectedAccountsResult.error);
      return NextResponse.json({ error: 'Failed to check email availability' }, { status: 500 });
    }

    const profileMatch = profilesResult.data?.[0] ?? null;
    const accountMatch = connectedAccountsResult.data?.[0] ?? null;
    const matchesCurrentProfile =
      purpose === PROFILE_EMAIL_CODE_PURPOSE &&
      Boolean(address) &&
      typeof profileMatch?.address === 'string' &&
      profileMatch.address.toLowerCase() === address.toLowerCase();
    const matchesCurrentAccount =
      purpose === PROFILE_EMAIL_CODE_PURPOSE &&
      Boolean(address) &&
      typeof accountMatch?.address === 'string' &&
      accountMatch.address.toLowerCase() === address.toLowerCase();

    if ((profileMatch && !matchesCurrentProfile) || (accountMatch && !matchesCurrentAccount)) {
      return NextResponse.json(
        { error: 'Email is already registered.' },
        { status: 409 }
      );
    }

    const code = createEmailCode();
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('email_verification_codes')
      .insert([
        {
          email: normalizedEmail,
          code_hash: hashEmailCode(normalizedEmail, code, purpose),
          purpose,
          expires_at: expiresAt,
        },
      ]);

    if (insertError) {
      console.error('Failed to store email verification code:', insertError);
      return NextResponse.json({ error: 'Failed to prepare verification code' }, { status: 500 });
    }

    const template = emailTemplates.emailVerificationCode({
      code,
      expiresInMinutes: EMAIL_CODE_TTL_MINUTES,
    });

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: template.subject,
        html: template.html,
      });
    } catch (emailError) {
      console.error('Failed to deliver email verification code:', emailError);
      return NextResponse.json(
        { error: emailError instanceof Error ? emailError.message : 'Failed to deliver verification code' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });
  } catch (error) {
    console.error('Email code request failed:', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
