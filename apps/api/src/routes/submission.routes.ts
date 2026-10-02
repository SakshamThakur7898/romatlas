import { Router } from 'express';
import { submitContribution } from '../controllers/report.controller';
import { authenticate, requireRole } from '../middleware/auth';

export const submissionRouter = Router();
submissionRouter.post('/', authenticate, requireRole('CONTRIBUTOR', 'MODERATOR', 'ADMIN'), submitContribution);
