import { NextRequest, NextResponse } from 'next/server';
import { requireRewardAddress } from '@/lib/rewardAuth';
import { REWARD_TERMS_VERSION, saveReward, toStatus } from '@/lib/rewardService';

export async function POST(request: NextRequest) {
  try {
    const address = requireRewardAddress(request);
    const { version, accepted } = await request.json().catch(() => ({ version: null, accepted: false }));
    if (accepted !== true || version !== REWARD_TERMS_VERSION) {
      return NextResponse.json({ error: 'Debes aceptar la versión vigente de los términos' }, { status: 400 });
    }
    const reward = await saveReward(address, { terms_accepted_at: new Date().toISOString(), terms_version: REWARD_TERMS_VERSION });
    return NextResponse.json(toStatus(reward));
  } catch (error) {
    if (error instanceof Error && error.message === 'REWARD_UNAUTHORIZED') return NextResponse.json({ error: 'Verifica nuevamente la propiedad de tu billetera' }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la aceptación' }, { status: 500 });
  }
}
