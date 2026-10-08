import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { askAssistant } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { env } from '../config/env';
import { limited } from '../utils/rateLimit';

export const aiRouter = Router();

// LLM calls cost money: sign-in required and a tight per-user limit.
const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (_req, res) => String(res.locals.userId),
  message: limited('The assistant is limited to a few questions per minute.'),
  skip: () => env.NODE_ENV === 'test',
});

aiRouter.post('/ask', authenticate, aiLimiter, askAssistant);
