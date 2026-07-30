import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Falta la dirección de la billetera' }, { status: 400 });
  const apiUrl = process.env.SOCIAL_REWARD_API_URL; const secret = process.env.SOCIAL_REWARD_API_SECRET;
  if (!apiUrl || !secret) return NextResponse.json({ error: 'La verificación social aún no está configurada' }, { status: 503 });
  const upstream = await fetch(`${apiUrl}/status?address=${encodeURIComponent(address)}&verify=${request.nextUrl.searchParams.get('verify') === 'true'}`, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' });
  return NextResponse.json(await upstream.json(), { status: upstream.status });
}
