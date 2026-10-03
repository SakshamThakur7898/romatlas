import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeCsv, groupDevices, parseCsv, parseGoogleRows } from '../src/parsers/googleCsv.parser';
import { androidForLineage, lifecycleFor, parseLineageDevice } from '../src/parsers/lineage.parser';
import { createSlugAllocator } from '../src/services/slugAllocator';

const CSV = [
  'Retail Branding,Marketing Name,Device,Model',
  'Xiaomi,POCO X3 NFC,surya,M2007J20CG',
  'Xiaomi,POCO X3 NFC,surya,M2007J20CT',
  'Xiaomi,POCO X3,surya,M2007J20CI',
  'samsung,Galaxy S9+,star2lte,SM-G965F',
  'samsung,Galaxy S9+,star2lte,SM-G965F',
  '"Acme, Inc","Quote ""Pro""",pro1,P1',
  ',Nameless,x,y',
].join('\r\n');

describe('Google CSV importer parsing', () => {
  it('parses quoted fields, escaped quotes and CRLF', () => {
    const rows = parseCsv('a,"b,c","d ""e"""\r\n1,2,3\n');
    expect(rows).toEqual([['a', 'b,c', 'd "e"'], ['1', '2', '3']]);
  });

  it('decodes UTF-16LE with BOM as Google publishes it', () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(CSV, 'utf16le')]);
    expect(decodeCsv(buf)).toBe(CSV);
    expect(decodeCsv(Buffer.from(CSV, 'utf8'))).toBe(CSV);
  });

  it('drops incomplete rows and rejects an unexpected header', () => {
    expect(parseGoogleRows(CSV).length).toBe(6);
    expect(() => parseGoogleRows('a,b\n1,2')).toThrow(/header/);
  });

  it('groups models under one device, picks the most common name and keeps the rest as aliases', () => {
    const drafts = groupDevices(parseGoogleRows(CSV));
    const surya = drafts.find((d) => d.codename === 'surya');
    expect(surya?.name).toBe('POCO X3 NFC');
    expect(surya?.aliases).toEqual(['POCO X3']);
    expect(surya?.modelNumbers).toEqual(['M2007J20CG', 'M2007J20CI', 'M2007J20CT']);
    expect(drafts.find((d) => d.codename === 'star2lte')?.brand).toBe('Samsung');
    expect(drafts.find((d) => d.codename === 'pro1')?.brandSlug).toBe('acme-inc');
    expect(drafts.length).toBe(3);
  });
});

describe('slug allocator', () => {
  it('keeps slugs unique within a brand and never touches existing ones', () => {
    const allocate = createSlugAllocator([{ brandSlug: 'samsung', slug: 'galaxy-s9' }]);
    expect(allocate('samsung', 'Galaxy S9', 'starlte')).toBe('galaxy-s9-starlte');
    expect(allocate('samsung', 'Galaxy S9', 'starqlte')).toBe('galaxy-s9-starqlte');
    expect(allocate('xiaomi', 'Galaxy S9', 'x')).toBe('galaxy-s9');
  });
});

describe('LineageOS wiki parser', () => {
  const manta = parseLineageDevice(readFileSync(path.join(__dirname, 'fixtures/manta.yml'), 'utf8'));

  it('parses a real wiki device file', () => {
    expect(manta?.codename).toBe('manta');
    expect(manta?.vendor).toBe('Google');
    expect(manta?.name).toBe('Nexus 10');
    expect(manta?.architecture).toBe('arm');
    expect(manta?.versions).toEqual([13]);
    expect(manta?.release?.getUTCFullYear()).toBe(2012);
    expect(manta?.discontinued).toBe(false);
  });

  it('returns null for unusable files', () => {
    expect(parseLineageDevice('just: a\nfile: without codename')).toBeNull();
    expect(parseLineageDevice(': : not yaml [')).toBeNull();
  });

  it('reads the older "channels: [discontinued]" flag and block-list models', () => {
    const d = parseLineageDevice('codename: n1awifi\nname: Galaxy Note 10.1\nvendor: Samsung\nchannels: [discontinued]\nmodels:\n- sm-p600\ncurrent_branch: 14.1\n');
    expect(d?.discontinued).toBe(true);
    expect(d?.models).toEqual(['SM-P600']);
    expect(d?.versions).toEqual([14.1]);
  });

  it('maps LineageOS versions to Android versions', () => {
    expect(androidForLineage(22.1)).toBe('15');
    expect(androidForLineage(13)).toBe('6');
    expect(androidForLineage(99)).toBeUndefined();
  });

  it('derives lifecycle and always states its basis', () => {
    if (!manta) throw new Error('fixture failed to parse');
    const old = lifecycleFor(manta, 23.2);
    expect(old.lifecycle).toBe('DISCONTINUED');
    expect(old.basis).toContain('13');
    expect(lifecycleFor({ ...manta, versions: [22.1] }, 23.2).lifecycle).toBe('ACTIVE');
    expect(lifecycleFor({ ...manta, versions: [] }, 23.2).lifecycle).toBe('UNKNOWN');
    expect(lifecycleFor({ ...manta, discontinued: true, versions: [23] }, 23).lifecycle).toBe('DISCONTINUED');
  });
});
