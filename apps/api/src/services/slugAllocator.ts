import { slugify } from '../utils/slug';

/**
 * Assigns each new device a slug that is unique within its brand. Slugs are only ever allocated for
 * NEW devices and never changed afterwards, so URLs stay stable across imports.
 */
export function createSlugAllocator(existing: { brandSlug: string; slug: string }[]) {
  const used = new Map<string, Set<string>>();
  const setFor = (brand: string) => {
    let s = used.get(brand);
    if (!s) { s = new Set<string>(); used.set(brand, s); }
    return s;
  };
  for (const e of existing) setFor(e.brandSlug).add(e.slug);

  return (brandSlug: string, name: string, codename: string): string => {
    const set = setFor(brandSlug);
    const base = slugify(name) || slugify(codename) || 'device';
    let slug = base;
    if (set.has(slug)) slug = `${base}-${slugify(codename)}`.replace(/-+$/, '');
    let n = 2;
    while (set.has(slug)) slug = `${base}-${slugify(codename)}-${n++}`;
    set.add(slug);
    return slug;
  };
}
