import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContribution } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { env } from '../config/env';
import { limited } from '../utils/rateLimit';

export const submissionRouter = Router();

// Any signed-in user may suggest additions; moderators approve before anything goes live.
const submissionLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (_req, res) => String(res.locals.userId),
  message: limited('Submission limit reached. Try again in a while.'),
  skip: () => env.NODE_ENV === 'test',
});

submissionRouter.post('/', authenticate, submissionLimiter, submitContribution);
