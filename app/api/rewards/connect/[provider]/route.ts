import { NextRequest, NextResponse } from 'next/server';
import { createPkce, X_SCOPES, xClientConfig } from '@/lib/rewardService';
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params; const address = request.nextUrl.searchParams.get('address'); const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  if (provider !== 'x' || !address) return NextResponse.json({ error: 'Solicitud de autenticación inválida' }, { status: 400 });
  try {
    const { clientId, redirectUri } = xClientConfig();
    const { verifier, challenge, state } = createPkce();
    const destination = new URL('https://x.com/i/oauth2/authorize');
    destination.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: X_SCOPES, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    const response = NextResponse.redirect(destination);
    response.cookies.set('cholo_x_oauth', Buffer.from(JSON.stringify({ state, verifier, address, returnTo: new URL(returnTo, request.nextUrl.origin).toString() })).toString('base64url'), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'X no está configurado' }, { status: 503 }); }
}
