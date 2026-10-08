import { Router } from 'express';
import {
  getStats, listUsers, updateUserRole,
  listReports, resolveReport,
  listSubmissions, reviewSubmission,
  listSources, updateSource,
  listAuditLogs, triggerSync, syncHistory, listAllGuides
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { objectIdParam } from '../middleware/params';

export const adminRouter = Router();
adminRouter.param('id', objectIdParam);

adminRouter.use(authenticate, requireRole('ADMIN', 'MODERATOR'));

adminRouter.get('/stats', getStats);

adminRouter.get('/users', listUsers);
adminRouter.patch('/users/:id/role', requireRole('ADMIN'), updateUserRole);

adminRouter.get('/reports', listReports);
adminRouter.patch('/reports/:id/resolve', resolveReport);

adminRouter.get('/submissions', listSubmissions);
adminRouter.patch('/submissions/:id/review', reviewSubmission);

adminRouter.get('/sources', listSources);
adminRouter.patch('/sources/:id', updateSource);

adminRouter.get('/audit-logs', requireRole('ADMIN'), listAuditLogs);

adminRouter.post('/sync', requireRole('ADMIN'), triggerSync);
adminRouter.get('/sync/history', syncHistory);
adminRouter.get('/guides', listAllGuides);
