import { SyncJobModel } from '../models';
import { importGoogleDevices } from '../jobs/importers/google.importer';
import { importLineageWiki } from '../jobs/importers/lineage.importer';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const SYNC_JOBS = {
  'google-devices': importGoogleDevices,
  'lineage-wiki': importLineageWiki,
} as const;
export type SyncJobName = keyof typeof SYNC_JOBS;
export const SYNC_ORDER: SyncJobName[] = ['google-devices', 'lineage-wiki'];

const STALE_RUNNING_MS = 30 * 60_000;

/** Runs one importer, recording the outcome. Importer failures are recorded, not thrown. */
export async function runSyncJob(name: SyncJobName, opts: { force?: boolean; triggeredBy?: string } = {}) {
  const running = await SyncJobModel.exists({ name, status: 'RUNNING', startedAt: { $gt: new Date(Date.now() - STALE_RUNNING_MS) } });
  if (running) throw new AppError(409, 'SYNC_RUNNING', `${name} is already running`);

  const job = await SyncJobModel.create({ name, status: 'RUNNING', startedAt: new Date(), triggeredBy: opts.triggeredBy ?? 'cli' });
  try {
    const stats = await SYNC_JOBS[name]({ force: opts.force });
    job.status = stats.skipped ? 'SKIPPED' : 'SUCCESS';
    job.stats = stats;
  } catch (err) {
    job.status = 'FAILED';
    job.error = err instanceof Error ? err.message : String(err);
    logger.error({ err, job: name }, 'sync job failed');
  }
  job.finishedAt = new Date();
  await job.save();
  return job;
}

/** Runs every importer in dependency order (the base catalogue first). */
export async function runAllSyncJobs(opts: { force?: boolean; triggeredBy?: string } = {}) {
  const results = [];
  for (const name of SYNC_ORDER) results.push(await runSyncJob(name, opts));
  return results;
}
