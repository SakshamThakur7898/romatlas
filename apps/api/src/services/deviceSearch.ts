export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Prefix/contains search across the fields users actually type (codename, model number, name, alias). */
export function deviceSearchFilter(q: string): Record<string, unknown> {
  const t = q.trim();
  return {
    $or: [
      { codename: { $regex: `^${escapeRegex(t.toLowerCase())}` } },
      { modelNumbers: { $regex: `^${escapeRegex(t.toUpperCase())}` } },
      { name: { $regex: escapeRegex(t), $options: 'i' } },
      { brand: { $regex: `^${escapeRegex(t)}`, $options: 'i' } },
      { aliases: { $regex: escapeRegex(t), $options: 'i' } },
    ],
  };
}
