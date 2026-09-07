import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Sigue a CHOLO directamente en X. El seguimiento es opcional y no se verifica.' }, { status: 410 });
}
