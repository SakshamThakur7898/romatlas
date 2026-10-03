import { logger } from '../utils/logger';

export interface BulkTotals {
  inserted: number;
  modified: number;
  errors: number;
}

/** Runs bulk operations in chunks. One bad document never aborts the whole import. */
export async function runBulk<T>(
  ops: T[],
  run: (chunk: T[]) => Promise<{ insertedCount: number; modifiedCount: number }>,
  size = 1000,
): Promise<BulkTotals> {
  const totals: BulkTotals = { inserted: 0, modified: 0, errors: 0 };
  for (let i = 0; i < ops.length; i += size) {
    try {
      const r = await run(ops.slice(i, i + size));
      totals.inserted += r.insertedCount;
      totals.modified += r.modifiedCount;
    } catch (err) {
      const writeErrors = (err as { writeErrors?: unknown[] }).writeErrors;
      totals.errors += writeErrors?.length ?? 1;
      logger.error({ err }, 'bulk write chunk failed');
    }
  }
  return totals;
}
