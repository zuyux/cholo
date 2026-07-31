import { NextRequest, NextResponse } from 'next/server';
import { CHOLO_X_USER_ID, getReward, getValidXAccessToken, saveReward, toStatus } from '@/lib/rewardService';
import { requireRewardAddress } from '@/lib/rewardAuth';

export async function POST(request: NextRequest) {
  try {
    const address = requireRewardAddress(request);
    const reward = await getReward(address);
    if (!reward?.x_user_id || !reward.x_access_token) return NextResponse.json({ error: 'Conecta primero tu cuenta de X' }, { status: 409 });
    let accessToken = await getValidXAccessToken(address, reward);
    const follow = (token: string) => fetch(`https://api.x.com/2/users/${reward.x_user_id}/following`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: CHOLO_X_USER_ID }),
      cache: 'no-store',
    });
    let upstream = await follow(accessToken);

    // X can revoke an access token before its advertised expiry. Refresh once and retry.
    if (upstream.status === 401 && reward.x_refresh_token) {
      accessToken = await getValidXAccessToken(address, reward, true);
      upstream = await follow(accessToken);
    }

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: payload.detail || payload.title || 'X no pudo completar el follow' }, { status: upstream.status });
    return NextResponse.json(toStatus(await saveReward(address, { x_following: true })));
  } catch (error) {
    if (error instanceof Error && error.message === 'REWARD_UNAUTHORIZED') return NextResponse.json({ error: 'Verifica nuevamente la propiedad de tu billetera' }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo seguir la cuenta en X' }, { status: 500 });
  }
}
