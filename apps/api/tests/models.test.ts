import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { slugify } from '../src/utils/slug';
import { DeviceModel, DeviceRomSupportModel, SourceModel, UserModel } from '../src/models';

const id = () => new mongoose.Types.ObjectId();

describe('slugify', () => {
  it('normalizes names', () => {
    expect(slugify('POCO X3 NFC')).toBe('poco-x3-nfc');
    expect(slugify('  Galaxy S21+ (5G) ')).toBe('galaxy-s21-5g');
  });
});

describe('Device model', () => {
  it('derives slugs and normalizes codename and model numbers', async () => {
    const d = new DeviceModel({
      brand: 'Xiaomi', name: 'POCO X3 NFC', codename: ' Surya ', modelNumbers: ['m2007j20cg'],
    });
    await d.validate();
    expect(d.brandSlug).toBe('xiaomi');
    expect(d.slug).toBe('poco-x3-nfc');
    expect(d.codename).toBe('surya');
    expect(d.modelNumbers).toEqual(['M2007J20CG']);
  });

  it('requires a codename', async () => {
    const d = new DeviceModel({ brand: 'Xiaomi', name: 'X' });
    await expect(d.validate()).rejects.toThrow(/codename/);
  });
});

describe('DeviceRomSupport model', () => {
  const base = { deviceId: id(), romId: id(), supportType: 'OFFICIAL', androidVersion: '15' };

  it('defaults to UNVERIFIED and requires a source URL', async () => {
    const ok = new DeviceRomSupportModel({ ...base, sourceUrl: 'https://lineageos.org' });
    await ok.validate();
    expect(ok.verificationStatus).toBe('UNVERIFIED');
    await expect(new DeviceRomSupportModel(base).validate()).rejects.toThrow(/sourceUrl/);
  });

  it('rejects non-http URLs', async () => {
    const bad = new DeviceRomSupportModel({ ...base, sourceUrl: 'javascript:alert(1)' });
    await expect(bad.validate()).rejects.toThrow(/http\(s\)/);
  });
});

describe('Source model', () => {
  it('derives the domain from the URL', async () => {
    const s = new SourceModel({ name: 'LineageOS', url: 'https://wiki.lineageos.org/x', type: 'DOCUMENTATION' });
    await s.validate();
    expect(s.domain).toBe('wiki.lineageos.org');
  });
});

describe('User model', () => {
  it('never serializes the password hash', () => {
    const u = new UserModel({
      name: 'A', username: 'alice', email: 'A@Example.com', passwordHash: 'secret',
    });
    expect(u.email).toBe('a@example.com');
    expect(JSON.stringify(u.toJSON())).not.toContain('secret');
  });
});
