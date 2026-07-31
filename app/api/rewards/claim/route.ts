import { NextRequest, NextResponse } from 'next/server';
import { getReward, REWARD_TERMS_VERSION, saveReward, toStatus } from '@/lib/rewardService';
import { requireRewardAddress } from '@/lib/rewardAuth';
export async function POST(request: NextRequest) {
  try {
    const address = requireRewardAddress(request);
    const current = await getReward(address);
    if (!current?.terms_accepted_at || current.terms_version !== REWARD_TERMS_VERSION) return NextResponse.json({ error: 'Acepta los términos de recompensa antes de reclamar' }, { status: 409 });
    if (!current?.x_following) return NextResponse.json({ error: 'Primero sigue la cuenta de CHOLO en X' }, { status: 409 });
    if (current.claimed) return NextResponse.json(toStatus(current));
    return NextResponse.json(toStatus(await saveReward(address, { claimed: true, claimed_at: new Date().toISOString() })));
  } catch (error) {
    if (error instanceof Error && error.message === 'REWARD_UNAUTHORIZED') return NextResponse.json({ error: 'Verifica nuevamente la propiedad de tu billetera' }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la recompensa' }, { status: 500 });
  }
}
