import { Router } from 'express';
import { submitReport } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

export const reportRouter = Router();
reportRouter.post('/', authenticate, submitReport);
