import { describe, expect, it } from 'vitest';
import { parseSubmissionPayload } from '../src/services/submission.service';
import { submissionSchema } from '../src/validators/schemas';

describe('contribution payload validation', () => {
  const device = { brand: 'Xiaomi', name: 'POCO X3 NFC', codename: 'surya', modelNumbers: [], aliases: [] };

  it('accepts a valid device and rejects unknown or malicious fields', () => {
    expect(parseSubmissionPayload('DEVICE', device).type).toBe('DEVICE');
    expect(() => parseSubmissionPayload('DEVICE', { ...device, slug: 'hijack' })).toThrow();
    expect(() => parseSubmissionPayload('DEVICE', { ...device, officialSource: 'javascript:alert(1)' })).toThrow();
  });

  it('rejects types that cannot be approved', () => {
    expect(() => parseSubmissionPayload('SOURCE', {})).toThrow(/not supported/);
    expect(submissionSchema.safeParse({ type: 'SOURCE', payload: {} }).success).toBe(false);
  });

  it('requires a guide to carry a source URL', () => {
    const guide = { title: 'Install', slug: 'install', deviceId: '64b7f0c2a1b2c3d4e5f60718', category: 'ROM_INSTALLATION', content: 'x' };
    expect(() => parseSubmissionPayload('GUIDE', guide)).toThrow();
    expect(parseSubmissionPayload('GUIDE', { ...guide, sourceUrl: 'https://wiki.lineageos.org/devices/surya/install' }).type).toBe('GUIDE');
  });
});

describe('community additions', () => {
  const ids = { deviceId: '64b7f0c2a1b2c3d4e5f60718', romId: '64b7f0c2a1b2c3d4e5f60719' };
  const support = { ...ids, supportType: 'COMMUNITY', androidVersion: '15', sourceUrl: 'https://example.com/thread' };

  it('accepts a community ROM-support report and keeps official support for official sources', () => {
    expect(parseSubmissionPayload('DEVICE_ROM_SUPPORT', support).type).toBe('DEVICE_ROM_SUPPORT');
    expect(() => parseSubmissionPayload('DEVICE_ROM_SUPPORT', { ...support, supportType: 'OFFICIAL' })).toThrow();
  });

  it('requires a source URL and rejects unsafe or unknown fields', () => {
    expect(() => parseSubmissionPayload('DEVICE_ROM_SUPPORT', { ...ids, supportType: 'COMMUNITY', androidVersion: '15' })).toThrow();
    expect(() => parseSubmissionPayload('DEVICE_ROM_SUPPORT', { ...support, downloadUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => parseSubmissionPayload('DEVICE_ROM_SUPPORT', { ...support, verificationStatus: 'VERIFIED' })).toThrow();
  });

  it('validates recovery and kernel additions', () => {
    expect(parseSubmissionPayload('RECOVERY', { deviceId: ids.deviceId, name: 'OrangeFox', supportType: 'COMMUNITY', sourceUrl: 'https://orangefox.download' }).type).toBe('RECOVERY');
    expect(parseSubmissionPayload('KERNEL', { deviceId: ids.deviceId, name: 'Example kernel', sourceRepository: 'https://github.com/example/kernel' }).type).toBe('KERNEL');
    expect(() => parseSubmissionPayload('KERNEL', { deviceId: ids.deviceId, name: 'x' })).toThrow();
  });
});
