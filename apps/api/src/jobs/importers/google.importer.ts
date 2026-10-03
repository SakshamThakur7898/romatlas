import { createHash } from 'node:crypto';
import { Types, type AnyBulkWriteOperation } from 'mongoose';
import { DeviceModel, type IDevice } from '../../models';
import { env } from '../../config/env';
import { decodeCsv, groupDevices, parseGoogleRows } from '../../parsers/googleCsv.parser';
import { createSlugAllocator } from '../../services/slugAllocator';
import { recordCheck, upsertSource } from '../../services/sourceRegistry';
import { logger } from '../../utils/logger';
import { runBulk } from '../bulk';
import { fetchBuffer } from '../http';

/** Imports the base device catalogue (brand, marketing name, codename, model numbers). */
export async function importGoogleDevices(opts: { force?: boolean } = {}): Promise<Record<string, unknown>> {
  const source = await upsertSource({
    name: 'Google Play supported devices',
    url: 'https://support.google.com/googleplay/android-developer/answer/6154891',
    type: 'DOCUMENTATION',
    reliabilityType: 'FIRST_PARTY',
  });

  try {
    const { body, status } = await fetchBuffer(env.GOOGLE_DEVICES_URL);
    const hash = createHash('sha256').update(body).digest('hex');
    if (!opts.force && source.contentHash === hash) {
      await recordCheck(source._id, { ok: true, httpStatus: status });
      return { skipped: true, reason: 'source unchanged' };
    }

    const rows = parseGoogleRows(decodeCsv(body));
    const drafts = groupDevices(rows);
    logger.info({ rows: rows.length, devices: drafts.length }, 'parsed Google device list');

    const existing = await DeviceModel.find({}, 'brandSlug codename slug').lean();
    const byKey = new Map(existing.map((d) => [`${d.brandSlug}|${d.codename}`, d]));
    const allocate = createSlugAllocator(existing);

    const ops: AnyBulkWriteOperation<IDevice>[] = [];
    let created = 0;
    for (const d of drafts) {
      const found = byKey.get(`${d.brandSlug}|${d.codename}`);
      if (found) {
        if (d.modelNumbers.length || d.aliases.length) {
          ops.push({
            updateOne: {
              filter: { _id: found._id },
              update: { $addToSet: { modelNumbers: { $each: d.modelNumbers }, aliases: { $each: d.aliases } } },
            },
          });
        }
      } else {
        created++;
        ops.push({
          insertOne: {
            document: {
              _id: new Types.ObjectId(),
              brand: d.brand,
              brandSlug: d.brandSlug,
              name: d.name,
              slug: allocate(d.brandSlug, d.name, d.codename),
              codename: d.codename,
              modelNumbers: d.modelNumbers,
              aliases: d.aliases,
              supported: true,
            },
          },
        });
      }
    }

    const totals = await runBulk(ops, (chunk) => DeviceModel.bulkWrite(chunk, { ordered: false }));
    await recordCheck(source._id, { ok: true, httpStatus: status, contentHash: hash });
    return { rows: rows.length, devices: drafts.length, created, inserted: totals.inserted, updated: totals.modified, errors: totals.errors };
  } catch (err) {
    await recordCheck(source._id, { ok: false }).catch(() => undefined);
    throw err;
  }
}
