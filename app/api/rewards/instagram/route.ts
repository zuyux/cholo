import { NextRequest, NextResponse } from 'next/server';

const INSTAGRAM_USERNAME = /^[A-Za-z0-9._]{1,30}$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim().replace(/^@/, '') : '';
  if (!address) return NextResponse.json({ error: 'Falta la dirección de la billetera' }, { status: 400 });
  if (!INSTAGRAM_USERNAME.test(username)) return NextResponse.json({ error: 'El usuario de Instagram no es válido' }, { status: 400 });

  const apiUrl = process.env.SOCIAL_REWARD_API_URL;
  const secret = process.env.SOCIAL_REWARD_API_SECRET;
  if (!apiUrl || !secret) return NextResponse.json({ error: 'El servicio de recompensas aún no está configurado' }, { status: 503 });

  const upstream = await fetch(`${apiUrl.replace(/\/$/, '')}/instagram`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, username }),
    cache: 'no-store',
  });
  const payload = await upstream.json().catch(() => ({ error: 'Respuesta inválida del servicio de recompensas' }));
  return NextResponse.json(payload, { status: upstream.status });
}
