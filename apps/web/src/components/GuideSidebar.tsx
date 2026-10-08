import type { Heading } from '../lib/markdown';

export function GuideSidebar({ headings }: { headings: Heading[] }) {
  const items = headings.filter((h) => h.level >= 2 || headings.length <= 1);
  if (items.length === 0) return null;
  return (
    <nav aria-label="On this page" className="lg:sticky lg:top-20">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">On this page</p>
      <ul className="space-y-1 border-l border-line">
        {items.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className={`block py-0.5 text-sm text-muted transition-colors duration-150 hover:text-accent ${h.level === 3 ? 'pl-6' : 'pl-3'}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
