import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Las recompensas están sujetas a revisión manual. No hay reclamos automáticos.' }, { status: 410 });
}
