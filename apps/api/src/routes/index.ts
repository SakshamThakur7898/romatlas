import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { deviceRouter } from './device.routes';
import { romRouter } from './rom.routes';
import { guideRouter } from './guide.routes';
import { updateRouter } from './update.routes';
import { userRouter } from './user.routes';
import { reportRouter } from './report.routes';
import { adminRouter } from './admin.routes';
import { aiRouter } from './ai.routes';
import { submissionRouter } from './submission.routes';
import { globalSearch, publicStats } from '../controllers/search.controller';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/devices', deviceRouter);
apiRouter.use('/roms', romRouter);
apiRouter.use('/guides', guideRouter);
apiRouter.use('/updates', updateRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/submissions', submissionRouter);
apiRouter.get('/stats', publicStats);
apiRouter.get('/search', globalSearch);
