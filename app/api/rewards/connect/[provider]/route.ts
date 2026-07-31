import { NextRequest, NextResponse } from 'next/server';
import { createPkce, getReward, REWARD_TERMS_VERSION, X_SCOPES, xClientConfig } from '@/lib/rewardService';
import { requireRewardAddress } from '@/lib/rewardAuth';
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params; const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  if (provider !== 'x') return NextResponse.json({ error: 'Solicitud de autenticación inválida' }, { status: 400 });
  try {
    const address = requireRewardAddress(request);
    const reward = await getReward(address);
    if (!reward?.terms_accepted_at || reward.terms_version !== REWARD_TERMS_VERSION) return NextResponse.json({ error: 'Acepta los términos de recompensa antes de conectar X' }, { status: 409 });
    const { clientId, redirectUri } = xClientConfig();
    const { verifier, challenge, state } = createPkce();
    const destination = new URL('https://x.com/i/oauth2/authorize');
    destination.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: X_SCOPES, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    const response = NextResponse.redirect(destination);
    response.cookies.set('cholo_x_oauth', Buffer.from(JSON.stringify({ state, verifier, address, returnTo: new URL(returnTo, request.nextUrl.origin).toString() })).toString('base64url'), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'REWARD_UNAUTHORIZED') return NextResponse.json({ error: 'Verifica nuevamente la propiedad de tu billetera' }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'X no está configurado' }, { status: 503 });
  }
}
