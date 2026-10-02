import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main() {
  await connectDb();
  createApp().listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
});
