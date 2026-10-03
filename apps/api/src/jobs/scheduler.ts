import { env } from '../config/env';
import { runAllSyncJobs } from '../services/sync.service';
import { logger } from '../utils/logger';

/** Periodic source sync. Opt-in via SYNC_ENABLED=true. Overlap is prevented by the RUNNING check in the job runner. */
export function startScheduler(): void {
  if (!env.SYNC_ENABLED) return;
  const tick = () => {
    runAllSyncJobs({ triggeredBy: 'scheduler' }).catch((err) => logger.error({ err }, 'scheduled sync failed'));
  };
  setTimeout(tick, 30_000);
  setInterval(tick, env.SYNC_INTERVAL_HOURS * 3_600_000);
  logger.info({ everyHours: env.SYNC_INTERVAL_HOURS }, 'source sync scheduler enabled');
}
