import crypto from 'crypto';

const tokenSecret =
  process.env.EMAIL_TOKEN_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!tokenSecret) {
  throw new Error('EMAIL_TOKEN_SECRET, SUPABASE_SECRET_KEY, or SUPABASE_SERVICE_ROLE_KEY must be set to use email code authentication.');
}

export const EMAIL_CODE_PURPOSE = 'create_account';
export const PROFILE_EMAIL_CODE_PURPOSE = 'profile_email';
export type EmailCodePurpose = typeof EMAIL_CODE_PURPOSE | typeof PROFILE_EMAIL_CODE_PURPOSE;
export const EMAIL_CODE_TTL_MINUTES = 10;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const VERIFIED_EMAIL_TOKEN_TTL_MINUTES = 15;

export class VerifiedEmailTokenError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'VerifiedEmailTokenError';
    this.statusCode = statusCode;
  }
}

interface VerifiedEmailTokenPayload {
  email: string;
  purpose: EmailCodePurpose;
  exp: number;
  iat: number;
  nonce: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createSignature = (payloadPart: string) =>
  crypto.createHmac('sha256', tokenSecret as string).update(payloadPart).digest('base64url');

export function createEmailCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function isEmailCodePurpose(value: unknown): value is EmailCodePurpose {
  return value === EMAIL_CODE_PURPOSE || value === PROFILE_EMAIL_CODE_PURPOSE;
}

export function hashEmailCode(email: string, code: string, purpose: EmailCodePurpose = EMAIL_CODE_PURPOSE): string {
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}:${purpose}:${code}:${tokenSecret}`)
    .digest('hex');
}

export function createVerifiedEmailToken(email: string, purpose: EmailCodePurpose = EMAIL_CODE_PURPOSE): string {
  const now = Date.now();
  const payload: VerifiedEmailTokenPayload = {
    email: normalizeEmail(email),
    purpose,
    iat: now,
    exp: now + VERIFIED_EMAIL_TOKEN_TTL_MINUTES * 60 * 1000,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createSignature(payloadPart);

  return `${payloadPart}.${signature}`;
}

export function decodeVerifiedEmailToken(token: string): VerifiedEmailTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new VerifiedEmailTokenError('Verified email token is required');
  }

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) {
    throw new VerifiedEmailTokenError('Invalid verified email token');
  }

  const expectedSignature = createSignature(payloadPart);
  const signatureBuffer = Buffer.from(signaturePart, 'base64url');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new VerifiedEmailTokenError('Invalid verified email token signature', 401);
  }

  let payload: VerifiedEmailTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as VerifiedEmailTokenPayload;
  } catch {
    throw new VerifiedEmailTokenError('Malformed verified email token');
  }

  if (!isEmailCodePurpose(payload.purpose)) {
    throw new VerifiedEmailTokenError('Verified email token purpose mismatch');
  }

  if (payload.exp < Date.now()) {
    throw new VerifiedEmailTokenError('Verified email token expired', 410);
  }

  return payload;
}

export function assertVerifiedEmailToken(
  token: string,
  email: string,
  expectedPurpose: EmailCodePurpose = EMAIL_CODE_PURPOSE
) {
  const payload = decodeVerifiedEmailToken(token);

  if (payload.purpose !== expectedPurpose) {
    throw new VerifiedEmailTokenError('Verified email token purpose mismatch', 401);
  }

  if (payload.email !== normalizeEmail(email)) {
    throw new VerifiedEmailTokenError('Verified email token does not match email', 401);
  }

  return payload;
}
