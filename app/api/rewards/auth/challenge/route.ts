import { NextRequest, NextResponse } from 'next/server';
import { validateStacksAddress } from '@stacks/transactions';
import { createRewardChallenge, setRewardChallengeCookie } from '@/lib/rewardAuth';

export async function POST(request: NextRequest) {
  const { address } = await request.json().catch(() => ({ address: null }));
  if (typeof address !== 'string' || !validateStacksAddress(address)) {
    return NextResponse.json({ error: 'Dirección de Stacks inválida' }, { status: 400 });
  }
  const challenge = createRewardChallenge(address);
  const response = NextResponse.json({ message: challenge.message });
  setRewardChallengeCookie(response, challenge.cookie);
  return response;
}
