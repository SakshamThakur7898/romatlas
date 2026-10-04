import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveActivity, githubOrgFromUrl, parseRomSeed } from '../src/parsers/romSeed.parser';
import { slugify } from '../src/utils/slug';

describe('ROM project seed', () => {
  const seed = parseRomSeed(JSON.parse(readFileSync(path.join(__dirname, '../data/rom-projects.json'), 'utf8')));

  it('ships a valid list with unique slugs', () => {
    expect(seed.length).toBeGreaterThan(80);
    const slugs = seed.map((e) => slugify(e.name));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every(Boolean)).toBe(true);
  });

  it('rejects malformed entries and unknown fields', () => {
    expect(() => parseRomSeed([{ name: '' }])).toThrow();
    expect(() => parseRomSeed([{ name: 'X', github: 'javascript:alert(1)' }])).toThrow();
    expect(() => parseRomSeed([{ name: 'X', slug: 'y' }])).toThrow();
  });

  it('extracts GitHub accounts only from github.com URLs', () => {
    expect(githubOrgFromUrl('https://github.com/crdroidandroid')).toBe('crdroidandroid');
    expect(githubOrgFromUrl('https://github.com/LineageOS/android/tree/main')).toBe('LineageOS');
    expect(githubOrgFromUrl('https://gitlab.com/x')).toBeNull();
    expect(githubOrgFromUrl('not a url')).toBeNull();
    expect(githubOrgFromUrl('https://github.com/')).toBeNull();
  });
});

describe('activity-derived status', () => {
  const now = new Date('2026-10-04T00:00:00Z');

  it('marks recent pushes active and old ones inactive, always stating the basis', () => {
    const active = deriveActivity(new Date('2026-08-01T00:00:00Z'), 'Foo', now);
    expect(active.status).toBe('ACTIVE');
    expect(active.note).toContain('2026-08-01');
    const stale = deriveActivity(new Date('2024-01-01T00:00:00Z'), 'Foo', now);
    expect(stale.status).toBe('INACTIVE');
    expect(stale.note).toContain('2024-01-01');
  });

  it('stays UNKNOWN without evidence', () => {
    expect(deriveActivity(null, 'Foo', now).status).toBe('UNKNOWN');
  });
});
