import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AnyBulkWriteOperation } from 'mongoose';
import { RomModel, UpdateEventModel } from '../../models';
import { deriveActivity, githubOrgFromUrl, parseRomSeed } from '../../parsers/romSeed.parser';
import { recordCheck, upsertSource } from '../../services/sourceRegistry';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { slugify } from '../../utils/slug';
import { runBulk } from '../bulk';
import { githubGet } from '../github';

const SEED_FILE = path.resolve(__dirname, '../../../data/rom-projects.json');
const BATCH_WITHOUT_TOKEN = 25; // 2 API calls per project, 60 requests/hour unauthenticated
const BATCH_WITH_TOKEN = 200;

interface GhUser { description?: string | null; bio?: string | null; avatar_url?: string; blog?: string | null }
interface GhRepo { pushed_at?: string | null }

const asUrl = (v?: string | null): string | undefined => {
  if (!v) return undefined;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return /^https?:\/\/[^\s]+\.[^\s]+$/i.test(withScheme) ? withScheme : undefined;
};

/**
 * Indexes the custom ROM projects from data/rom-projects.json, then enriches a rotating batch of them
 * from the GitHub API (description, logo, website, and an activity-derived status with its basis).
 * Device builds are NOT guessed here: a project existing says nothing about which devices it supports.
 */
export async function importRomProjects(): Promise<Record<string, unknown>> {
  const raw = await readFile(SEED_FILE, 'utf8');
  const entries = parseRomSeed(JSON.parse(raw));
  const source = await upsertSource({
    name: 'Curated ROM project list',
    url: 'https://github.com/wshamroukh/Android_Custom_Rom_List',
    type: 'OTHER',
    reliabilityType: 'THIRD_PARTY',
  });

  try {
    // ── 1. upsert the projects (never overwrites richer data from other importers) ──
    const seen = new Set<string>();
    const ops: AnyBulkWriteOperation<Record<string, unknown>>[] = [];
    let duplicates = 0;
    for (const e of entries) {
      const slug = slugify(e.name);
      if (!slug || seen.has(slug)) { duplicates++; continue; }
      seen.add(slug);
      const org = e.github ? githubOrgFromUrl(e.github) : null;
      const set: Record<string, unknown> = {};
      if (org) { set.organization = org; set.repository = `https://github.com/${org}`; }
      if (e.website) set.website = e.website;
      if (e.telegram) set.telegramUrl = e.telegram;
      if (e.discord) set.discordUrl = e.discord;
      ops.push({
        updateOne: {
          filter: { slug },
          update: {
            $setOnInsert: { name: e.name, status: 'UNKNOWN', officialStatus: 'UNKNOWN', supportedAndroidVersions: [], sourceId: source._id },
            ...(Object.keys(set).length ? { $set: set } : {}),
          },
          upsert: true,
        },
      });
    }
    const seeded = await runBulk(ops, (chunk) => RomModel.bulkWrite(chunk as never, { ordered: false }).then((r) => ({ insertedCount: r.upsertedCount, modifiedCount: r.modifiedCount })));

    // ── 2. enrich a batch from GitHub, least recently checked first ─────────────
    const limit = env.GITHUB_TOKEN ? BATCH_WITH_TOKEN : BATCH_WITHOUT_TOKEN;
    const batch = await RomModel.find({ organization: { $exists: true, $ne: null } }).sort({ lastCheckedAt: 1 }).limit(limit);
    let enriched = 0;
    let notFound = 0;
    let rateLimited = false;
    const events: Record<string, unknown>[] = [];

    for (const rom of batch) {
      const org = rom.organization as string;
      const account = await githubGet<GhUser>(`/users/${encodeURIComponent(org)}`);
      if (account.rateLimited) { rateLimited = true; break; }
      const now = new Date();

      if (account.status === 404) {
        notFound++;
        await RomModel.updateOne({ _id: rom._id }, { lastCheckedAt: now, statusNote: `GitHub account ${org} was not found.` });
        continue;
      }
      if (!account.data) {
        logger.warn({ org, status: account.status }, 'GitHub lookup failed; will retry next run');
        continue; // leave lastCheckedAt untouched so it is retried
      }

      const repos = await githubGet<GhRepo[]>(`/users/${encodeURIComponent(org)}/repos?sort=pushed&direction=desc&per_page=1`);
      if (repos.rateLimited) { rateLimited = true; break; }
      const pushed = repos.data?.[0]?.pushed_at ? new Date(repos.data[0].pushed_at) : null;
      const activity = deriveActivity(pushed, org, now);

      const set: Record<string, unknown> = { lastCheckedAt: now, statusNote: activity.note };
      if (repos.data) set.status = activity.status; // only trust activity when the repo call succeeded
      if (account.data.avatar_url && /^https:\/\//.test(account.data.avatar_url)) set.logo = account.data.avatar_url;
      const description = account.data.description ?? account.data.bio;
      if (description && !rom.description) set.description = description.slice(0, 2000);
      const site = asUrl(account.data.blog);
      if (site && !rom.website) set.website = site;
      await RomModel.updateOne({ _id: rom._id }, set);
      enriched++;

      if (repos.data && rom.status !== 'UNKNOWN' && rom.status !== activity.status) {
        events.push({
          romId: rom._id, sourceId: source._id, updateType: 'STATUS_CHANGE',
          previousValue: rom.status, newValue: activity.status, sourceUrl: `https://github.com/${org}`,
        });
      }
    }
    if (events.length) await UpdateEventModel.insertMany(events);
    await recordCheck(source._id, { ok: true, contentHash: createHash('sha256').update(raw).digest('hex') });

    const pending = await RomModel.countDocuments({ organization: { $exists: true, $ne: null }, lastCheckedAt: { $exists: false } });
    return {
      projectsInList: entries.length, duplicatesSkipped: duplicates, created: seeded.inserted,
      enrichedFromGithub: enriched, githubNotFound: notFound, rateLimited, neverCheckedYet: pending,
      usedToken: Boolean(env.GITHUB_TOKEN), events: events.length,
    };
  } catch (err) {
    await recordCheck(source._id, { ok: false }).catch(() => undefined);
    throw err;
  }
}
