import { Router } from 'express';
import { listUpdates } from '../controllers/update.controller';

export const updateRouter = Router();

updateRouter.get('/', listUpdates);
