import { NextRequest, NextResponse } from 'next/server';
import { CHOLO_X_USERNAME, getReward, saveReward, toStatus } from '@/lib/rewardService';

export async function POST(request: NextRequest) {
  const { address } = await request.json().catch(() => ({ address: null }));
  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'Falta la dirección de la billetera' }, { status: 400 });
  }

  try {
    const reward = await getReward(address);
    if (!reward?.x_user_id || !reward.x_access_token) return NextResponse.json({ error: 'Conecta primero tu cuenta de X' }, { status: 409 });
    const targetResponse = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(CHOLO_X_USERNAME)}`, { headers: { Authorization: `Bearer ${reward.x_access_token}` }, cache: 'no-store' });
    const target = await targetResponse.json().catch(() => ({}));
    if (!targetResponse.ok || !target.data?.id) return NextResponse.json({ error: 'No se pudo encontrar la cuenta oficial de CHOLO en X' }, { status: targetResponse.status });
    const upstream = await fetch(`https://api.x.com/2/users/${reward.x_user_id}/following`, { method: 'POST', headers: { Authorization: `Bearer ${reward.x_access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ target_user_id: target.data.id }), cache: 'no-store' });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: payload.detail || payload.title || 'X no pudo completar el follow' }, { status: upstream.status });
    return NextResponse.json(toStatus(await saveReward(address, { x_following: true })));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo seguir la cuenta en X' }, { status: 500 }); }
}
