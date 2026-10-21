import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SESSION_DURATION_HOURS } from '@/lib/constants';
import type { UserRole } from '@/lib/appointment-rules';

// Sesión: JWT HS256 en cookie httpOnly (RN-06). Lleva sub, role y exp, y nada más.

export interface SessionPayload {
  userId: number;
  role: UserRole;
}

const secret = (): Uint8Array => new TextEncoder().encode(process.env.JWT_SECRET ?? '');
const SECONDS_PER_HOUR = 3600;

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const userId = Number(payload.sub);
    const role = payload['role'];
    if (!Number.isInteger(userId) || typeof role !== 'string') return null;
    return { userId, role: role as UserRole };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_HOURS * SECONDS_PER_HOUR,
  };
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions(), maxAge: 0 });
}

export async function readSessionFromCookies(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}
