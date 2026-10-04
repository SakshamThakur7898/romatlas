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

  it('rejects types that cannot be approved yet', () => {
    expect(() => parseSubmissionPayload('KERNEL', {})).toThrow(/not supported/);
    expect(submissionSchema.safeParse({ type: 'KERNEL', payload: {} }).success).toBe(false);
  });

  it('requires a guide to carry a source URL', () => {
    const guide = { title: 'Install', slug: 'install', deviceId: '64b7f0c2a1b2c3d4e5f60718', category: 'ROM_INSTALLATION', content: 'x' };
    expect(() => parseSubmissionPayload('GUIDE', guide)).toThrow();
    expect(parseSubmissionPayload('GUIDE', { ...guide, sourceUrl: 'https://wiki.lineageos.org/devices/surya/install' }).type).toBe('GUIDE');
  });
});
