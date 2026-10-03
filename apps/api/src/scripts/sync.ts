import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { runAllSyncJobs, runSyncJob, SYNC_JOBS, type SyncJobName } from '../services/sync.service';
import { logger } from '../utils/logger';

// Usage: npm run sync -w apps/api -- [all|google-devices|lineage-wiki] [--force]
async function main() {
  const target = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'all';
  const force = process.argv.includes('--force');
  if (target !== 'all' && !(target in SYNC_JOBS)) {
    throw new Error(`Unknown job "${target}". Use: all, ${Object.keys(SYNC_JOBS).join(', ')}`);
  }
  await connectDb();
  const jobs = target === 'all' ? await runAllSyncJobs({ force }) : [await runSyncJob(target as SyncJobName, { force })];
  for (const j of jobs) {
    console.log(`${j.name}: ${j.status}`, j.error ?? JSON.stringify(j.stats));
  }
  if (jobs.some((j) => j.status === 'FAILED')) process.exitCode = 1;
}

main()
  .catch((err) => {
    logger.error({ err }, 'sync failed');
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
