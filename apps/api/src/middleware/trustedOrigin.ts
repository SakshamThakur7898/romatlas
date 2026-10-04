import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const normalize = (o: string) => o.replace(/\/+$/, '');

/**
 * CSRF guard for cookie-authenticated endpoints. With SameSite=None the refresh cookie travels on
 * cross-site requests, so browsers' Origin header must match our frontend. Non-browser clients send no Origin.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin;
  if (origin && normalize(origin) !== normalize(env.CLIENT_ORIGIN)) {
    return next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Request origin is not allowed'));
  }
  next();
};
