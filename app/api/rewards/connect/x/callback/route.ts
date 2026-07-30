import { NextRequest, NextResponse } from 'next/server';
import { saveReward, xClientConfig } from '@/lib/rewardService';

export async function GET(request: NextRequest) {
  const fallback = new URL('/', request.nextUrl.origin);
  try {
    const raw = request.cookies.get('cholo_x_oauth')?.value;
    if (!raw) throw new Error('La sesión OAuth expiró');
    const session = JSON.parse(Buffer.from(raw, 'base64url').toString()) as { state: string; verifier: string; address: string; returnTo: string };
    if (!request.nextUrl.searchParams.get('code') || request.nextUrl.searchParams.get('state') !== session.state) throw new Error('Respuesta OAuth inválida');
    const { clientId, clientSecret, redirectUri } = xClientConfig();
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: request.nextUrl.searchParams.get('code')!, grant_type: 'authorization_code', redirect_uri: redirectUri, code_verifier: session.verifier }) });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description || 'X rechazó la autorización');
    const meResponse = await fetch('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store' });
    const me = await meResponse.json();
    if (!meResponse.ok || !me.data?.id) throw new Error('No se pudo obtener el perfil de X');
    await saveReward(session.address, { x_user_id: me.data.id, x_username: me.data.username, x_access_token: token.access_token, x_refresh_token: token.refresh_token || null, x_token_expires_at: new Date(Date.now() + Number(token.expires_in || 7200) * 1000).toISOString(), x_connected: true });
    const response = NextResponse.redirect(session.returnTo);
    response.cookies.delete('cholo_x_oauth');
    return response;
  } catch (error) {
    fallback.searchParams.set('rewardError', error instanceof Error ? error.message : 'No se pudo conectar X');
    return NextResponse.redirect(fallback);
  }
}
