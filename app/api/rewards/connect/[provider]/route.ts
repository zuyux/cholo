import { NextRequest, NextResponse } from 'next/server';
import { createPkce, getReward, REWARD_TERMS_VERSION, X_SCOPES, xClientConfig } from '@/lib/rewardService';
import { requireRewardAddress } from '@/lib/rewardAuth';
import { instagramClientConfig } from '@/lib/instagramAuth';

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (provider !== 'x' && provider !== 'instagram') return NextResponse.json({ error: 'Solicitud de autenticación inválida' }, { status: 400 });
  let returnTo = new URL('/', request.nextUrl.origin);
  try {
    const requestedReturn = new URL(request.nextUrl.searchParams.get('returnTo') || '/', request.nextUrl.origin);
    if (requestedReturn.origin === request.nextUrl.origin) returnTo = requestedReturn;
    returnTo.searchParams.delete('rewardError');
    returnTo.searchParams.delete('rewardXConnected');
    returnTo.searchParams.delete('rewardInstagramConnected');
    const address = requireRewardAddress(request);
    const reward = await getReward(address);
    if (!reward?.terms_accepted_at || reward.terms_version !== REWARD_TERMS_VERSION) {
      return NextResponse.json({ error: 'Acepta los términos antes de autenticar tus cuentas' }, { status: 409 });
    }
    const { clientId, redirectUri } = provider === 'x' ? xClientConfig() : instagramClientConfig();
    const { verifier, challenge, state } = createPkce();
    const destination = new URL(provider === 'x' ? 'https://x.com/i/oauth2/authorize' : 'https://www.instagram.com/oauth/authorize');
    destination.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: provider === 'x' ? X_SCOPES : 'instagram_business_basic', state }).toString();
    if (provider === 'x') {
      destination.searchParams.set('code_challenge', challenge);
      destination.searchParams.set('code_challenge_method', 'S256');
    }
    const response = NextResponse.redirect(destination);
    response.cookies.set(`cholo_${provider}_oauth`, Buffer.from(JSON.stringify({ state, verifier, address, returnTo: returnTo.toString() })).toString('base64url'), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' });
    return response;
  } catch (error) {
    const code = provider === 'instagram' && error instanceof Error && error.message === 'instagram_unavailable'
      ? 'instagram_unavailable' : `${provider}_connection_failed`;
    returnTo.searchParams.set('rewardError', code);
    return NextResponse.redirect(returnTo);
  }
}
