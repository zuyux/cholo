import { NextRequest, NextResponse } from 'next/server';
import { saveReward, toStatus } from '@/lib/rewardService';

const INSTAGRAM_USERNAME = /^[A-Za-z0-9._]{1,30}$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim().replace(/^@/, '') : '';
  if (!address) return NextResponse.json({ error: 'Falta la dirección de la billetera' }, { status: 400 });
  if (!INSTAGRAM_USERNAME.test(username)) return NextResponse.json({ error: 'El usuario de Instagram no es válido' }, { status: 400 });

  try {
    return NextResponse.json(toStatus(await saveReward(address, { instagram_username: username, instagram_connected: true })));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar Instagram' }, { status: 500 });
  }
}
