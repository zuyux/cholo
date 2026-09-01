import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleIdToken } from '@/lib/server/googleAuth';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    const identity = await verifyGoogleIdToken(idToken);

    return NextResponse.json({
      email: identity.email,
      name: identity.name ?? null,
      picture: identity.picture ?? null,
      googleSubject: identity.subject,
      verifiedEmailToken: identity.verifiedEmailToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo verificar Google.';
    const status = message.includes('configurado') ? 501 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
