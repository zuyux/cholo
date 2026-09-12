import { NextRequest, NextResponse } from 'next/server';
import { verifyStacksWalletProof } from '@/lib/stacksWalletProof';
import { establishRewardSession, readRewardChallenge } from '@/lib/rewardAuth';

export async function POST(request: NextRequest) {
  const challenge = readRewardChallenge(request);
  const { signature, publicKey } = await request.json().catch(() => ({ signature: null, publicKey: null }));
  if (!challenge?.message || typeof signature !== 'string' || typeof publicKey !== 'string') {
    return NextResponse.json({ error: 'Prueba de propiedad incompleta o expirada' }, { status: 401 });
  }
  try {
    if (!verifyStacksWalletProof({ address: challenge.address, message: challenge.message, signature, publicKey })) {
      return NextResponse.json({ error: 'La firma no corresponde a esta billetera' }, { status: 403 });
    }
    const response = NextResponse.json({ success: true });
    establishRewardSession(response, challenge.address);
    return response;
  } catch {
    return NextResponse.json({ error: 'Firma de billetera inválida' }, { status: 403 });
  }
}
