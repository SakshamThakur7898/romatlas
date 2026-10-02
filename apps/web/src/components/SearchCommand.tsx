import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { apiGet, qs } from '../lib/api';
import { useDebounced, useSearchStore } from '../lib/hooks';
import type { SearchResults } from '../lib/types';

interface Item {
  key: string;
  group: 'DEVICES' | 'ROMS';
  label: string;
  meta?: string;
  to: string;
}

export function SearchCommand() {
  const { open, setOpen } = useSearchStore();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const dq = useDebounced(q.trim(), 200);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useSearchStore.getState().open);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search', dq],
    queryFn: () => apiGet<SearchResults>(`/search${qs({ q: dq })}`),
    enabled: open && dq.length >= 2,
  });

  const items = useMemo<Item[]>(
    () => [
      ...(data?.devices ?? []).map((d) => ({
        key: `d-${d._id}`, group: 'DEVICES' as const, label: d.name, meta: d.codename, to: `/devices/${d.brandSlug}/${d.slug}`,
      })),
      ...(data?.roms ?? []).map((r) => ({ key: `r-${r._id}`, group: 'ROMS' as const, label: r.name, to: `/roms/${r.slug}` })),
    ],
    [data],
  );

  useEffect(() => setActive(0), [items]);

  if (!open) return null;

  const go = (item: Item) => {
    setOpen(false);
    navigate(item.to);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); go(items[active]); }
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search ROMAtlas"
        className="fade-in mx-auto mt-[12vh] w-[min(36rem,calc(100%-2rem))] rounded-lg border border-line bg-surface shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={16} className="text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search device, codename, model or ROM…"
            aria-label="Search"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-line px-1.5 font-mono text-[10px] text-muted">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {dq.length < 2 && <p className="px-2 py-6 text-center text-sm text-muted">Type at least 2 characters. Try “surya” or “SM-G991”.</p>}
          {dq.length >= 2 && isFetching && items.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">Searching…</p>}
          {dq.length >= 2 && isError && <p className="px-2 py-6 text-center text-sm text-accent">Search is unavailable right now.</p>}
          {dq.length >= 2 && !isFetching && !isError && items.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">No results for “{dq}”.</p>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {header && <p className="px-2 pb-1 pt-3 font-mono text-[11px] tracking-widest text-muted">{header}</p>}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm ${i === active ? 'bg-paper text-accent' : ''}`}
                >
                  <span>{item.label}</span>
                  {item.meta && <span className="font-mono text-xs text-muted">{item.meta}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
