import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params; const address = request.nextUrl.searchParams.get('address'); const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  if (provider !== 'x' || !address) return NextResponse.json({ error: 'Solicitud de autenticación inválida' }, { status: 400 });
  const authUrl = process.env.SOCIAL_REWARD_AUTH_URL;
  if (!authUrl) return NextResponse.json({ error: 'La autenticación social aún no está configurada' }, { status: 503 });
  const destination = new URL(`${authUrl.replace(/\/$/, '')}/${provider}`);
  destination.searchParams.set('address', address); destination.searchParams.set('returnTo', new URL(returnTo, request.nextUrl.origin).toString());
  return NextResponse.redirect(destination);
}
