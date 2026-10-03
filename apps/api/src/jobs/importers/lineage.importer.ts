import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { Types, type AnyBulkWriteOperation } from 'mongoose';
import { DeviceModel, DeviceRomSupportModel, RomModel, UpdateEventModel, type IDevice } from '../../models';
import { env } from '../../config/env';
import { androidForLineage, lifecycleFor, parseLineageDevice, type LineageDevice } from '../../parsers/lineage.parser';
import { createSlugAllocator } from '../../services/slugAllocator';
import { recordCheck, upsertSource } from '../../services/sourceRegistry';
import { logger } from '../../utils/logger';
import { slugify } from '../../utils/slug';
import { runBulk } from '../bulk';

const run = promisify(execFile);
const git = async (args: string[], cwd?: string) => (await run('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 })).stdout.trim();

const WIKI = 'https://wiki.lineageos.org';

/** Shallow-clones (or refreshes) the wiki repo and returns its path and commit. */
async function syncRepo(): Promise<{ dir: string; commit: string }> {
  const dir = path.resolve(env.SYNC_CACHE_DIR, 'lineage_wiki');
  if (existsSync(path.join(dir, '.git'))) {
    await git(['fetch', '--depth', '1', 'origin', 'HEAD'], dir);
    await git(['reset', '--hard', 'FETCH_HEAD'], dir);
  } else {
    await mkdir(path.dirname(dir), { recursive: true });
    await git(['clone', '--depth', '1', env.LINEAGE_WIKI_REPO, dir]);
  }
  return { dir, commit: await git(['rev-parse', 'HEAD'], dir) };
}

async function readDevices(dir: string): Promise<{ devices: LineageDevice[]; unparsed: number }> {
  const folder = path.join(dir, '_data', 'devices');
  const files = (await readdir(folder)).filter((f) => f.endsWith('.yml'));
  const devices: LineageDevice[] = [];
  let unparsed = 0;
  for (const f of files) {
    const parsed = parseLineageDevice(await readFile(path.join(folder, f), 'utf8'));
    if (parsed) devices.push(parsed);
    else unparsed++;
  }
  return { devices, unparsed };
}

/**
 * Imports official LineageOS support from the LineageOS wiki data: which devices, which version,
 * and whether the device is listed as discontinued. Everything it writes points back to the wiki.
 */
export async function importLineageWiki(opts: { force?: boolean } = {}): Promise<Record<string, unknown>> {
  const source = await upsertSource({
    name: 'LineageOS wiki (device data)',
    url: 'https://github.com/LineageOS/lineage_wiki',
    type: 'GITHUB',
    reliabilityType: 'FIRST_PARTY',
  });

  try {
    const { dir, commit } = await syncRepo();
    const rom = await RomModel.findOneAndUpdate(
      { slug: 'lineageos' },
      {
        $setOnInsert: {
          name: 'LineageOS', slug: 'lineageos', description: 'Open-source Android distribution.',
          website: 'https://lineageos.org', repository: 'https://github.com/LineageOS', documentation: WIKI,
          officialStatus: 'OFFICIAL', sourceId: source._id,
        },
      },
      { upsert: true, new: true },
    );
    if (!rom) throw new Error('Could not create the LineageOS ROM record');

    if (!opts.force && source.contentHash === commit) {
      // Upstream unchanged: our VERIFIED records are still true as of now.
      const now = new Date();
      await DeviceRomSupportModel.updateMany(
        { romId: rom._id, verificationStatus: 'VERIFIED' },
        { lastCheckedAt: now, lastVerifiedAt: now },
      );
      await recordCheck(source._id, { ok: true });
      return { skipped: true, reason: 'wiki commit unchanged', commit };
    }

    const { devices: parsed, unparsed } = await readDevices(dir);
    if (parsed.length === 0) throw new Error('No devices parsed from the wiki repo (format changed?)');
    const now = new Date();

    // ── devices ──────────────────────────────────────────────────────────────
    const existing = await DeviceModel.find({}, 'brandSlug codename slug name').lean();
    const byCodename = new Map<string, typeof existing>();
    for (const d of existing) byCodename.set(d.codename, [...(byCodename.get(d.codename) ?? []), d]);
    const allocate = createSlugAllocator(existing);

    const deviceOps: AnyBulkWriteOperation<IDevice>[] = [];
    const resolved = new Map<string, Types.ObjectId>(); // codename -> device id
    let createdDevices = 0;
    let skippedNoVendor = 0;

    for (const l of parsed) {
      const candidates = byCodename.get(l.codename) ?? [];
      const vendorSlug = l.vendor ? slugify(l.vendor) : '';
      const match = candidates.length === 1 ? candidates[0] : candidates.find((c) => c.brandSlug === vendorSlug);

      if (match) {
        resolved.set(l.codename, match._id);
        const set: Record<string, unknown> = {};
        if (l.soc) set.chipset = l.soc;
        if (l.architecture) set.architecture = l.architecture;
        if (l.release) set.releaseDate = l.release;
        set.officialSource = `${WIKI}/devices/${l.codename}`;
        deviceOps.push({
          updateOne: {
            filter: { _id: match._id },
            update: {
              $set: set,
              $addToSet: { modelNumbers: { $each: l.models }, ...(l.name !== match.name ? { aliases: l.name } : {}) },
            },
          },
        });
      } else if (l.vendor) {
        const _id = new Types.ObjectId();
        resolved.set(l.codename, _id);
        createdDevices++;
        deviceOps.push({
          insertOne: {
            document: {
              _id, brand: l.vendor, brandSlug: vendorSlug, name: l.name,
              slug: allocate(vendorSlug, l.name, l.codename), codename: l.codename,
              modelNumbers: l.models, aliases: [], chipset: l.soc, architecture: l.architecture,
              releaseDate: l.release, officialSource: `${WIKI}/devices/${l.codename}`, supported: true,
            },
          },
        });
      } else {
        skippedNoVendor++;
      }
    }
    const deviceTotals = await runBulk(deviceOps, (chunk) => DeviceModel.bulkWrite(chunk, { ordered: false }));

    // ── support records + change detection ───────────────────────────────────
    const priorSupports = await DeviceRomSupportModel.find({ romId: rom._id }).lean();
    const prior = new Map(priorSupports.map((s) => [String(s.deviceId), s]));
    const firstImport = priorSupports.length === 0;
    const events: Record<string, unknown>[] = [];
    const supportOps: AnyBulkWriteOperation<Record<string, unknown>>[] = [];
    const seen = new Set<string>();
    const androidVersions = new Set<string>();
    const latestVersion = Math.max(...parsed.map((l) => l.versions[0] ?? 0));

    for (const l of parsed) {
      const deviceId = resolved.get(l.codename);
      if (!deviceId) continue;
      const top = l.versions[0];
      const android = top !== undefined ? androidForLineage(top) : undefined;
      const { lifecycle, basis } = lifecycleFor(l, latestVersion);
      if (android && lifecycle === 'ACTIVE') androidVersions.add(android);

      const fields = {
        supportType: 'OFFICIAL',
        androidVersion: android ?? 'Unknown',
        lifecycle,
        sourceUrl: `${WIKI}/devices/${l.codename}`,
        downloadUrl: `https://download.lineageos.org/devices/${l.codename}/builds`,
        documentationUrl: `${WIKI}/devices/${l.codename}/install`,
        maintainer: l.maintainer,
        lastCheckedAt: now,
        lastVerifiedAt: now,
        verificationStatus: 'VERIFIED',
        notes: `${top !== undefined ? `LineageOS ${top}` : 'Listed'} per the LineageOS wiki. Lifecycle ${lifecycle.toLowerCase()}: ${basis}.`,
      };

      const key = String(deviceId);
      seen.add(key);
      const before = prior.get(key);
      if (before) {
        supportOps.push({ updateOne: { filter: { _id: before._id }, update: { $set: fields } } });
        if (before.lifecycle !== lifecycle && before.lifecycle !== 'UNKNOWN') {
          events.push({ deviceId, romId: rom._id, sourceId: source._id, updateType: 'STATUS_CHANGE', previousValue: before.lifecycle, newValue: lifecycle, sourceUrl: fields.sourceUrl });
        }
        if (before.androidVersion !== fields.androidVersion) {
          events.push({ deviceId, romId: rom._id, sourceId: source._id, updateType: 'ANDROID_VERSION', previousValue: before.androidVersion, newValue: fields.androidVersion, sourceUrl: fields.sourceUrl });
        }
      } else {
        supportOps.push({ insertOne: { document: { _id: new Types.ObjectId(), deviceId, romId: rom._id, ...fields } } });
        if (!firstImport) {
          events.push({ deviceId, romId: rom._id, sourceId: source._id, updateType: 'STATUS_CHANGE', previousValue: 'not listed', newValue: 'listed', sourceUrl: fields.sourceUrl });
        }
      }
    }

    // Records the wiki no longer lists: keep them, but never present them as current.
    for (const s of priorSupports) {
      if (!seen.has(String(s.deviceId)) && s.verificationStatus !== 'OUTDATED') {
        supportOps.push({ updateOne: { filter: { _id: s._id }, update: { $set: { verificationStatus: 'OUTDATED', lastCheckedAt: now } } } });
        events.push({ deviceId: s.deviceId, romId: rom._id, sourceId: source._id, updateType: 'STATUS_CHANGE', previousValue: 'listed', newValue: 'no longer listed', sourceUrl: s.sourceUrl });
      }
    }

    const supportTotals = await runBulk(supportOps, (chunk) => DeviceRomSupportModel.bulkWrite(chunk as never, { ordered: false }));
    if (events.length) await UpdateEventModel.insertMany(events);
    await RomModel.updateOne({ _id: rom._id }, { status: 'ACTIVE', supportedAndroidVersions: [...androidVersions].sort((a, b) => Number(b) - Number(a)) });
    await recordCheck(source._id, { ok: true, contentHash: commit });

    logger.info({ parsed: parsed.length }, 'LineageOS wiki import complete');
    return {
      commit, wikiDevices: parsed.length, unparsedFiles: unparsed, skippedNoVendor, createdDevices,
      supportInserted: supportTotals.inserted, supportUpdated: supportTotals.modified,
      errors: deviceTotals.errors + supportTotals.errors, events: events.length,
    };
  } catch (err) {
    await recordCheck(source._id, { ok: false }).catch(() => undefined);
    throw err;
  }
}
