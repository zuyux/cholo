import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const [profilesResult, connectedAccountsResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, address, email')
        .ilike('email', trimmedEmail)
        .limit(1),
      supabaseAdmin
        .from('connected_accounts')
        .select('address, email')
        .ilike('email', trimmedEmail)
        .limit(1)
    ]);

    if (profilesResult.error && profilesResult.error.code !== 'PGRST116') {
      console.error('Profile email check failed:', profilesResult.error);
      return NextResponse.json(
        {
          error: 'Failed to check profiles table',
          details: profilesResult.error.message
        },
        { status: 500 }
      );
    }

    if (connectedAccountsResult.error && connectedAccountsResult.error.code !== 'PGRST116') {
      console.error('Connected accounts email check failed:', connectedAccountsResult.error);
      return NextResponse.json(
        {
          error: 'Failed to check connected accounts',
          details: connectedAccountsResult.error.message
        },
        { status: 500 }
      );
    }

    const profileMatch = Array.isArray(profilesResult.data) && profilesResult.data.length > 0
      ? profilesResult.data[0]
      : null;
    const accountMatch = Array.isArray(connectedAccountsResult.data) && connectedAccountsResult.data.length > 0
      ? connectedAccountsResult.data[0]
      : null;

    return NextResponse.json({
      exists: Boolean(profileMatch || accountMatch),
      inProfiles: Boolean(profileMatch),
      inConnectedAccounts: Boolean(accountMatch),
      profileAddress: profileMatch?.address ?? null,
      accountAddress: accountMatch?.address ?? null,
    });
  } catch (error) {
    console.error('Email check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
