import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, refresh, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { requireTrustedOrigin } from '../middleware/trustedOrigin';
import { env } from '../config/env';
import { limited } from '../utils/rateLimit';

export const authRouter = Router();

// Brute-force protection for credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limited('Too many attempts. Please wait a few minutes.'),
  skip: () => env.NODE_ENV === 'test',
});

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh', requireTrustedOrigin, authLimiter, refresh);
authRouter.post('/logout', requireTrustedOrigin, logout);
authRouter.get('/me', authenticate, me);
