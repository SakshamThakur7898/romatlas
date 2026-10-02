import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { verifyAccess } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      userId: string;
      userRole: string;
      requestId: string;
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header'));
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccess(token);
    res.locals.userId = payload.userId;
    res.locals.userRole = payload.role;
    return next();
  } catch {
    return next(new AppError(401, 'TOKEN_INVALID', 'Token is invalid or expired'));
  }
};

export function requireRole(...roles: string[]): RequestHandler {
  return (_req, res, next) => {
    if (!roles.includes(res.locals.userRole)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    return next();
  };
}

export const optionalAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccess(header.slice(7));
      res.locals.userId = payload.userId;
      res.locals.userRole = payload.role;
    } catch {
      // ignore — optional
    }
  }
  return next();
};
