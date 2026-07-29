import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, address } = await request.json();

    if (!email || !address) {
      return NextResponse.json({ error: 'Email and address are required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account confirmation handled',
      email,
      address,
    });
  } catch (error) {
    console.error('Account-created notification failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
