import type { Types } from 'mongoose';
import { SourceModel } from '../models';

type SourceType = 'OFFICIAL_PROJECT' | 'OFFICIAL_DEVICE_PAGE' | 'GITHUB' | 'GITLAB' | 'DOCUMENTATION' | 'COMMUNITY' | 'FORUM' | 'OTHER';

export async function upsertSource(def: { name: string; url: string; type: SourceType; reliabilityType: 'FIRST_PARTY' | 'THIRD_PARTY' | 'USER_SUBMITTED' }) {
  const doc = await SourceModel.findOneAndUpdate(
    { url: def.url },
    { $setOnInsert: { ...def, domain: new URL(def.url).hostname, status: 'ACTIVE' } },
    { upsert: true, new: true },
  );
  if (!doc) throw new Error(`Could not register source ${def.url}`);
  return doc;
}

/** Records the outcome of a check so the UI can show "source check failed" or a fresh timestamp. */
export async function recordCheck(
  id: Types.ObjectId,
  result: { ok: boolean; httpStatus?: number; contentHash?: string },
): Promise<void> {
  await SourceModel.updateOne(
    { _id: id },
    {
      lastCheckedAt: new Date(),
      lastHttpStatus: result.httpStatus,
      status: result.ok ? 'ACTIVE' : 'CHECK_FAILED',
      ...(result.contentHash ? { contentHash: result.contentHash } : {}),
    },
  );
}
