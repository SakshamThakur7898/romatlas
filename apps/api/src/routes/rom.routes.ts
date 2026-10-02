import { Router } from 'express';
import {
  listRoms, getRom, getRomDevices, createRom, updateRom, deleteRom,
} from '../controllers/rom.controller';
import { followRom, unfollowRom } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { objectIdParam } from '../middleware/params';

export const romRouter = Router();
romRouter.param('id', objectIdParam);

romRouter.get('/', listRoms);
romRouter.get('/:slug', getRom);
romRouter.get('/:slug/devices', getRomDevices);

romRouter.post('/:id/follow', authenticate, followRom);
romRouter.delete('/:id/follow', authenticate, unfollowRom);

romRouter.post('/', authenticate, requireRole('ADMIN', 'MODERATOR'), createRom);
romRouter.patch('/:id', authenticate, requireRole('ADMIN', 'MODERATOR'), updateRom);
romRouter.delete('/:id', authenticate, requireRole('ADMIN'), deleteRom);
