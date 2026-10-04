import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
}
export interface RefreshPayload extends TokenPayload {
  jti: string;
  family: string;
}

const expiry = (v: string) => v as SignOptions['expiresIn'];

export function signAccess(payload: TokenPayload): string {
  return jwt.sign({ userId: payload.userId, role: payload.role }, env.JWT_SECRET, {
    expiresIn: expiry(env.JWT_EXPIRES_IN),
  });
}

export function signRefresh(payload: RefreshPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: expiry(env.JWT_REFRESH_EXPIRES_IN) });
}

export function verifyAccess(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefresh(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
}

export const REFRESH_COOKIE = 'romatlas_refresh';
export const REFRESH_COOKIE_MAX_SEC = 60 * 60 * 24 * 7;

export function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    // SameSite=None is only honoured by browsers together with Secure.
    secure: env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: maxAgeSec * 1000,
  };
}
