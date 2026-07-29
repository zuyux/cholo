import crypto from 'crypto';

export type EmailTokenType = 'verify' | 'remove';

export interface EmailTokenPayload {
  email: string;
  address: string;
  type: EmailTokenType;
  exp: number;
  iat: number;
  nonce: string;
}

export class EmailTokenError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'EmailTokenError';
    this.statusCode = statusCode;
  }
}

const tokenSecret =
  process.env.EMAIL_TOKEN_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!tokenSecret) {
  throw new Error('EMAIL_TOKEN_SECRET, SUPABASE_SECRET_KEY, or SUPABASE_SERVICE_ROLE_KEY must be set to issue email tokens.');
}

const base64UrlEncode = (value: Buffer) => value.toString('base64url');
const base64UrlDecode = (value: string) => Buffer.from(value, 'base64url');

const createSignature = (payloadPart: string) =>
  crypto.createHmac('sha256', tokenSecret as string).update(payloadPart).digest('base64url');

export function createEmailToken({
  email,
  address,
  type,
  expiresInHours = 48,
}: {
  email: string;
  address: string;
  type: EmailTokenType;
  expiresInHours?: number;
}): string {
  const now = Date.now();
  const exp = now + expiresInHours * 60 * 60 * 1000;
  const payload: EmailTokenPayload = {
    email: email.toLowerCase(),
    address,
    type,
    iat: now,
    exp,
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const payloadPart = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = createSignature(payloadPart);

  return `${payloadPart}.${signature}`;
}

export function decodeEmailToken(token: string, expectedType?: EmailTokenType): EmailTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new EmailTokenError('Token is required');
  }

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) {
    throw new EmailTokenError('Invalid token format');
  }

  const expectedSignature = createSignature(payloadPart);
  const signatureBuffer = base64UrlDecode(signaturePart);
  const expectedBuffer = base64UrlDecode(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new EmailTokenError('Invalid token signature', 401);
  }

  let payload: EmailTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart).toString('utf8')) as EmailTokenPayload;
  } catch {
    throw new EmailTokenError('Malformed token payload');
  }

  if (expectedType && payload.type !== expectedType) {
    throw new EmailTokenError('Token type mismatch', 400);
  }

  if (payload.exp < Date.now()) {
    throw new EmailTokenError('Token expired', 410);
  }

  return payload;
}
