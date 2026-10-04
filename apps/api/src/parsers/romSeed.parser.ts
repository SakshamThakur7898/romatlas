import { z } from 'zod';

const link = z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) URL');

const seedSchema = z.array(
  z.object({
    name: z.string().trim().min(1).max(120),
    github: link.optional(),
    website: link.optional(),
    telegram: link.optional(),
    discord: link.optional(),
  }).strict(),
);
export type RomSeedEntry = z.infer<typeof seedSchema>[number];

export function parseRomSeed(json: unknown): RomSeedEntry[] {
  return seedSchema.parse(json);
}

/** "https://github.com/crdroidandroid/anything" -> "crdroidandroid"; null when it is not a GitHub account URL. */
export function githubOrgFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null;
    const first = u.pathname.split('/').filter(Boolean)[0];
    return first && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(first) ? first : null;
  } catch {
    return null;
  }
}

export const ACTIVE_WITHIN_DAYS = 365;

/**
 * Project activity derived from the newest public push on the project's GitHub account.
 * This is a heuristic signal, so the note says exactly what it was based on.
 */
export function deriveActivity(
  pushedAt: Date | null,
  org: string,
  now = new Date(),
): { status: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN'; note: string } {
  if (!pushedAt || Number.isNaN(pushedAt.getTime())) {
    return { status: 'UNKNOWN', note: `GitHub account ${org} has no public repository activity to judge from.` };
  }
  const days = (now.getTime() - pushedAt.getTime()) / 86_400_000;
  const date = pushedAt.toISOString().slice(0, 10);
  return days <= ACTIVE_WITHIN_DAYS
    ? { status: 'ACTIVE', note: `Derived from GitHub: ${org} last pushed code on ${date}.` }
    : { status: 'INACTIVE', note: `Derived from GitHub: ${org} has had no public push since ${date} (over ${ACTIVE_WITHIN_DAYS} days).` };
}
