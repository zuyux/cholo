import { NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
  const { address } = await request.json().catch(() => ({ address: null }));
  if (!address || typeof address !== 'string') return NextResponse.json({ error: 'Falta la dirección de la billetera' }, { status: 400 });
  const apiUrl = process.env.SOCIAL_REWARD_API_URL; const secret = process.env.SOCIAL_REWARD_API_SECRET;
  if (!apiUrl || !secret) return NextResponse.json({ error: 'El servicio de recompensas aún no está configurado' }, { status: 503 });
  const upstream = await fetch(`${apiUrl}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ address }), cache: 'no-store' });
  return NextResponse.json(await upstream.json(), { status: upstream.status });
}
