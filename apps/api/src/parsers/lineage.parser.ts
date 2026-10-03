import { load } from 'js-yaml';

export interface LineageDevice {
  codename: string;
  vendor?: string;
  name: string;
  models: string[];
  soc?: string;
  architecture?: 'arm64' | 'arm' | 'x86_64' | 'x86';
  release?: Date;
  discontinued: boolean;
  maintainer?: string;
  /** LineageOS versions the wiki lists for the device, highest first. */
  versions: number[];
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v]);

function toDate(v: unknown): Date | undefined {
  if (Array.isArray(v)) return toDate(v[0]);
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'number' && v > 1900 && v < 2200) return new Date(Date.UTC(v, 0, 1));
  if (typeof v === 'string') {
    const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(v.trim());
    if (m) return new Date(Date.UTC(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, m[3] ? Number(m[3]) : 1));
  }
  return undefined;
}

function toArch(v: unknown): LineageDevice['architecture'] {
  const raw = typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>).cpu : v;
  const s = typeof raw === 'string' ? raw.toLowerCase().replace('-', '_') : '';
  return s === 'arm64' || s === 'arm' || s === 'x86' || s === 'x86_64' ? s : undefined;
}

/** Returns null when the file is not a usable device description. */
export function parseLineageDevice(text: string): LineageDevice | null {
  let doc: unknown;
  try {
    doc = load(text);
  } catch {
    return null;
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return null;
  const d = doc as Record<string, unknown>;
  const codename = str(d.codename)?.toLowerCase();
  const name = str(d.name);
  if (!codename || !name) return null;

  const versionSource = d.versions !== undefined ? list(d.versions) : list(d.current_branch);
  const versions = versionSource
    .map((v) => (typeof v === 'number' ? v : parseFloat(String(v))))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);

  return {
    codename,
    vendor: str(d.vendor),
    name,
    models: list(d.models).map((m) => str(m)?.toUpperCase()).filter((m): m is string => !!m),
    soc: str(d.soc),
    architecture: toArch(d.architecture),
    release: toDate(d.release),
    discontinued: list(d.channels).some((c) => String(c).toLowerCase() === 'discontinued'),
    maintainer: list(d.maintainers).map((m) => str(m)).find((m): m is string => !!m),
    versions,
  };
}

const ANDROID_FOR_LINEAGE: Record<number, string> = { 11: '4.4', 12: '5', 13: '6', 14: '7', 15: '8', 16: '9', 17: '10', 18: '11', 19: '12', 20: '13', 21: '14', 22: '15', 23: '16' };

/** Maps a LineageOS version (e.g. 22.1) to its Android version; undefined when unknown. */
export function androidForLineage(version: number): string | undefined {
  return ANDROID_FOR_LINEAGE[Math.floor(version)];
}

/** A device whose newest LineageOS version is within this many major versions of the latest counts as active. */
export const ACTIVE_WITHIN_MAJOR_VERSIONS = 2;

/**
 * Lifecycle for a device on the LineageOS wiki. An explicit "discontinued" channel is the source's own
 * statement; otherwise it is DERIVED from how far behind the wiki's newest version the device is, and the
 * returned `basis` says so (it is written into the record's notes).
 */
export function lifecycleFor(
  d: LineageDevice,
  latest: number,
): { lifecycle: 'ACTIVE' | 'DISCONTINUED' | 'UNKNOWN'; basis: string } {
  if (d.discontinued) return { lifecycle: 'DISCONTINUED', basis: 'listed as discontinued on the wiki' };
  const top = d.versions[0];
  if (top === undefined) return { lifecycle: 'UNKNOWN', basis: 'the wiki lists no LineageOS version for it' };
  if (Math.floor(top) >= Math.floor(latest) - ACTIVE_WITHIN_MAJOR_VERSIONS) {
    return { lifecycle: 'ACTIVE', basis: `its newest version (${top}) is within ${ACTIVE_WITHIN_MAJOR_VERSIONS} releases of the latest on the wiki (${latest})` };
  }
  return { lifecycle: 'DISCONTINUED', basis: `its newest version (${top}) is more than ${ACTIVE_WITHIN_MAJOR_VERSIONS} releases behind the latest on the wiki (${latest})` };
}
