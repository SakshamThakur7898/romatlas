import { env } from './env';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  logger.info({ uri: env.MONGODB_URI }, 'MongoDB connected');
}
