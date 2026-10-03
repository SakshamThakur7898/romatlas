import { slugify } from '../utils/slug';

export interface GoogleRow {
  brand: string;
  name: string;
  codename: string;
  model: string;
}

export interface DeviceDraft {
  brand: string;
  brandSlug: string;
  name: string;
  codename: string;
  modelNumbers: string[];
  aliases: string[];
}

/** Google publishes this CSV as UTF-16LE with a BOM; accept UTF-8 too. */
export function decodeCsv(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8');
  return buf.toString('utf8');
}

/** RFC 4180-style CSV: quoted fields, escaped quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseGoogleRows(text: string): GoogleRow[] {
  const table = parseCsv(text);
  const header = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  const idx = {
    brand: header.indexOf('retail branding'),
    name: header.indexOf('marketing name'),
    codename: header.indexOf('device'),
    model: header.indexOf('model'),
  };
  if (Object.values(idx).some((i) => i < 0)) throw new Error('Unexpected CSV header: ' + header.join(','));
  const out: GoogleRow[] = [];
  for (const r of table.slice(1)) {
    const row = {
      brand: (r[idx.brand] ?? '').trim(),
      name: (r[idx.name] ?? '').trim(),
      codename: (r[idx.codename] ?? '').trim(),
      model: (r[idx.model] ?? '').trim(),
    };
    if (row.brand && row.name && row.codename) out.push(row);
  }
  return out;
}

function mostFrequent(counts: Map<string, number>): string {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))[0][0];
}

/** Collapses rows (one per model number) into one draft per brand + codename. Output order is stable. */
export function groupDevices(rows: GoogleRow[]): DeviceDraft[] {
  const brandCasing = new Map<string, Map<string, number>>();
  const groups = new Map<string, { brandSlug: string; codename: string; names: Map<string, number>; models: Set<string> }>();

  for (const r of rows) {
    const brandSlug = slugify(r.brand);
    if (!brandSlug) continue;
    const casing = brandCasing.get(brandSlug) ?? new Map<string, number>();
    casing.set(r.brand, (casing.get(r.brand) ?? 0) + 1);
    brandCasing.set(brandSlug, casing);

    const codename = r.codename.toLowerCase();
    const key = `${brandSlug}|${codename}`;
    const g = groups.get(key) ?? { brandSlug, codename, names: new Map<string, number>(), models: new Set<string>() };
    g.names.set(r.name, (g.names.get(r.name) ?? 0) + 1);
    if (r.model) g.models.add(r.model.toUpperCase());
    groups.set(key, g);
  }

  const brandName = (slug: string) => {
    const best = mostFrequent(brandCasing.get(slug) ?? new Map([[slug, 1]]));
    return best === best.toLowerCase() ? best.charAt(0).toUpperCase() + best.slice(1) : best;
  };

  return [...groups.values()]
    .sort((a, b) => a.brandSlug.localeCompare(b.brandSlug) || a.codename.localeCompare(b.codename))
    .map((g) => {
      const name = mostFrequent(g.names);
      return {
        brand: brandName(g.brandSlug),
        brandSlug: g.brandSlug,
        name,
        codename: g.codename,
        modelNumbers: [...g.models].sort(),
        aliases: [...g.names.keys()].filter((n) => n !== name).sort(),
      };
    });
}
