import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { NextRequest } from 'next/server';

export interface SessionPayload extends jose.JWTPayload {
  userId: string;
  email: string;
  communityId: string;
  role: string;
  fullName?: string;
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET is not set in production environment! Using fallback secret is insecure.');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-at-least-32-characters-long-key'
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signJWT(payload: SessionPayload, expiry: string = '7d'): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export interface PasswordResetPayload extends jose.JWTPayload {
  purpose: 'password-reset';
  staffId: string;
  email: string;
  pwFingerprint: string;
}

export async function signPasswordResetToken(payload: {
  staffId: string;
  email: string;
  pwFingerprint: string;
}): Promise<string> {
  return new jose.SignJWT({ ...payload, purpose: 'password-reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

export async function verifyPasswordResetToken(
  token: string
): Promise<PasswordResetPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (payload.purpose !== 'password-reset') return null;
    return payload as PasswordResetPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;
  return verifyJWT(token);
}
