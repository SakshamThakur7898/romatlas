import { Router } from 'express';
import {
  listDevices, lookupDevice, getDeviceById, getDeviceRoms, getDeviceRecoveries, getDeviceKernels,
  getDeviceGuides, getDeviceUpdates, createDevice, updateDevice, deleteDevice,
} from '../controllers/device.controller';
import { followDevice, unfollowDevice } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { objectIdParam } from '../middleware/params';

export const deviceRouter = Router();
deviceRouter.param('id', objectIdParam);

deviceRouter.get('/', listDevices);
deviceRouter.get('/lookup/:brand/:slug', lookupDevice);
deviceRouter.get('/:id', getDeviceById);
deviceRouter.get('/:id/roms', getDeviceRoms);
deviceRouter.get('/:id/recoveries', getDeviceRecoveries);
deviceRouter.get('/:id/kernels', getDeviceKernels);
deviceRouter.get('/:id/guides', getDeviceGuides);
deviceRouter.get('/:id/updates', getDeviceUpdates);

deviceRouter.post('/:id/follow', authenticate, followDevice);
deviceRouter.delete('/:id/follow', authenticate, unfollowDevice);

deviceRouter.post('/', authenticate, requireRole('ADMIN', 'MODERATOR'), createDevice);
deviceRouter.patch('/:id', authenticate, requireRole('ADMIN', 'MODERATOR'), updateDevice);
deviceRouter.delete('/:id', authenticate, requireRole('ADMIN'), deleteDevice);
