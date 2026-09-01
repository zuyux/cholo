import { createVerifiedEmailToken } from '@/lib/emailCodeAuth';

export interface VerifiedGoogleIdentity {
  email: string;
  name?: string;
  picture?: string;
  subject: string;
  verifiedEmailToken: string;
}

interface GoogleTokenInfoResponse {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
}

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

export async function verifyGoogleIdToken(idToken: unknown): Promise<VerifiedGoogleIdentity> {
  if (typeof idToken !== 'string' || idToken.length < 32) {
    throw new Error('La credencial de Google es obligatoria.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('El inicio con Google no esta configurado.');
  }

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`, {
    cache: 'no-store',
  });
  const tokenInfo = (await response.json()) as GoogleTokenInfoResponse;

  if (!response.ok || tokenInfo.error) {
    throw new Error(tokenInfo.error_description || 'No se pudo verificar la credencial de Google.');
  }

  if (tokenInfo.aud !== clientId) {
    throw new Error('La credencial de Google no corresponde a esta aplicacion.');
  }

  if (!tokenInfo.sub) {
    throw new Error('La credencial de Google no incluye un identificador.');
  }

  if (!tokenInfo.email || (tokenInfo.email_verified !== true && tokenInfo.email_verified !== 'true')) {
    throw new Error('El correo de Google no esta verificado.');
  }

  const email = tokenInfo.email.trim().toLowerCase();

  return {
    email,
    name: tokenInfo.name,
    picture: tokenInfo.picture,
    subject: tokenInfo.sub,
    verifiedEmailToken: createVerifiedEmailToken(email),
  };
}
