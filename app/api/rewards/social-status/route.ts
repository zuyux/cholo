import { NextRequest, NextResponse } from 'next/server';
import { getReward, toStatus } from '@/lib/rewardService';
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Falta la dirección de la billetera' }, { status: 400 });
  try { return NextResponse.json(toStatus(await getReward(address))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo consultar la recompensa' }, { status: 500 }); }
}
