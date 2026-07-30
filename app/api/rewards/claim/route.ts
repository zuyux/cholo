import { NextRequest, NextResponse } from 'next/server';
import { getReward, saveReward, toStatus } from '@/lib/rewardService';
export async function POST(request: NextRequest) {
  const { address } = await request.json().catch(() => ({ address: null }));
  if (!address || typeof address !== 'string') return NextResponse.json({ error: 'Falta la dirección de la billetera' }, { status: 400 });
  try {
    const current = await getReward(address);
    if (!current?.instagram_connected || !current?.x_following) return NextResponse.json({ error: 'Completa primero los requisitos sociales' }, { status: 409 });
    if (current.claimed) return NextResponse.json(toStatus(current));
    return NextResponse.json(toStatus(await saveReward(address, { claimed: true, claimed_at: new Date().toISOString() })));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la recompensa' }, { status: 500 }); }
}
