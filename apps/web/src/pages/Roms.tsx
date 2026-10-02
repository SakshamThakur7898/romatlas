import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGetPage, qs } from '../lib/api';
import { useDebounced, usePageMeta } from '../lib/hooks';
import type { Rom } from '../lib/types';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Pagination, StatusBadge } from '../components/ui';

const STATUSES = ['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'UNKNOWN'];

export default function Roms() {
  usePageMeta('ROMs', 'Custom Android ROM projects and the devices they support.');
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const status = STATUSES.includes(params.get('status') ?? '') ? (params.get('status') as string) : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [text, setText] = useState(urlQ);
  const debounced = useDebounced(text, 300);

  const update = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    setParams(sp, { replace: true });
  };
  useEffect(() => {
    if (debounced !== urlQ) update({ q: debounced || undefined, page: undefined });
  }, [debounced]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['roms', urlQ, status, page],
    queryFn: () => apiGetPage<Rom>(`/roms${qs({ q: urlQ, status, page, limit: 20 })}`),
    placeholderData: (prev) => prev,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">INDEX</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">ROM projects</h1>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search ROM projects" aria-label="Search ROMs" className="h-10 w-full max-w-md rounded border border-line bg-surface px-3 text-sm outline-none focus:border-accent" />
        <select value={status} onChange={(e) => update({ status: e.target.value || undefined, page: undefined })} aria-label="Project status" className="h-10 rounded border border-line bg-surface px-2 text-sm">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading && <LoadingSkeleton rows={5} />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.data.length === 0 && <EmptyState title="No ROM projects match" />}
      {data && data.data.length > 0 && (
        <>
          <ul className="fade-in divide-y divide-line border-y border-line">
            {data.data.map((r) => (
              <li key={r._id}>
                <Link to={`/roms/${r.slug}`} className="flex items-center justify-between gap-4 py-3 transition-colors duration-150 hover:text-accent">
                  <span>
                    <span className="font-medium">{r.name}</span>
                    {r.description && <span className="block max-w-xl truncate text-xs text-muted">{r.description}</span>}
                  </span>
                  <span className="flex items-center gap-2"><Badge>{r.officialStatus}</Badge><StatusBadge status={r.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.meta.page} pages={data.meta.pages} onPage={(p) => update({ page: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </main>
  );
}
