import { NextRequest, NextResponse } from 'next/server';
import { getReward, toStatus } from '@/lib/rewardService';
import { requireRewardAddress } from '@/lib/rewardAuth';
export async function GET(request: NextRequest) {
  try { return NextResponse.json(toStatus(await getReward(requireRewardAddress(request)))); }
  catch (error) {
    if (error instanceof Error && error.message === 'REWARD_UNAUTHORIZED') return NextResponse.json({ error: 'Verifica nuevamente la propiedad de tu billetera' }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo consultar la recompensa' }, { status: 500 });
  }
}
