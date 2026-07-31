import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'cholo_reward_session';
const CHALLENGE_COOKIE = 'cholo_reward_challenge';
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const CHALLENGE_TTL_SECONDS = 5 * 60;

type SignedPayload = { address: string; exp: number; nonce?: string; message?: string };

function secret() {
  const value = process.env.REWARD_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!value) throw new Error('Falta REWARD_SESSION_SECRET');
  return value;
}

function sign(payload: SignedPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verify(value?: string): SignedPayload | null {
  if (!value) return null;
  const [encoded, suppliedSignature] = value.split('.');
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = createHmac('sha256', secret()).update(encoded).digest();
  const supplied = Buffer.from(suppliedSignature, 'base64url');
  if (supplied.length !== expectedSignature.length || !timingSafeEqual(supplied, expectedSignature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SignedPayload;
    return payload.address && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function createRewardChallenge(address: string) {
  const nonce = randomBytes(32).toString('hex');
  const exp = Date.now() + CHALLENGE_TTL_SECONDS * 1000;
  const message = `cholo.meme reward authentication\nAddress: ${address}\nNonce: ${nonce}\nExpires: ${new Date(exp).toISOString()}`;
  return { message, cookie: sign({ address, nonce, message, exp }) };
}

export function readRewardChallenge(request: NextRequest) {
  return verify(request.cookies.get(CHALLENGE_COOKIE)?.value);
}

export function setRewardChallengeCookie(response: NextResponse, value: string) {
  response.cookies.set(CHALLENGE_COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: CHALLENGE_TTL_SECONDS, path: '/' });
}

export function establishRewardSession(response: NextResponse, address: string) {
  response.cookies.set(SESSION_COOKIE, sign({ address, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_TTL_SECONDS, path: '/' });
  response.cookies.delete(CHALLENGE_COOKIE);
}

export function requireRewardAddress(request: NextRequest) {
  const session = verify(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new Error('REWARD_UNAUTHORIZED');
  return session.address;
}
