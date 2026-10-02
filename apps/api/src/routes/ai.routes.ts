import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { askAssistant } from '../controllers/ai.controller';
import { optionalAuth } from '../middleware/auth';
import { env } from '../config/env';

export const aiRouter = Router();

// LLM calls cost money: much tighter than the global limit.
const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
});

aiRouter.post('/ask', aiLimiter, optionalAuth, askAssistant);
