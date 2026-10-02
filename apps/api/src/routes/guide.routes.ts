import { Router } from 'express';
import {
  listGuides, getGuideById, getGuideBySlugs, createGuide, updateGuide, deleteGuide,
} from '../controllers/guide.controller';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { objectIdParam } from '../middleware/params';

export const guideRouter = Router();
guideRouter.param('id', objectIdParam);

guideRouter.get('/', listGuides);
guideRouter.get('/:deviceSlug/:guideSlug', getGuideBySlugs);
guideRouter.get('/:id', optionalAuth, getGuideById);

// Contributors do NOT publish directly; they go through /api/submissions and moderation.
guideRouter.post('/', authenticate, requireRole('ADMIN', 'MODERATOR'), createGuide);
guideRouter.patch('/:id', authenticate, requireRole('ADMIN', 'MODERATOR'), updateGuide);
guideRouter.delete('/:id', authenticate, requireRole('ADMIN'), deleteGuide);
