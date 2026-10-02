import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGetPage, qs } from '../lib/api';
import { useDebounced, usePageMeta } from '../lib/hooks';
import type { Device } from '../lib/types';
import { EmptyState, ErrorState, LoadingSkeleton, Mono, Pagination } from '../components/ui';

export default function Devices() {
  usePageMeta('Devices', 'Browse Android devices and their custom ROM ecosystem.');
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const supported = params.get('supported') === 'true';
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
    queryKey: ['devices', urlQ, supported, page],
    queryFn: () => apiGetPage<Device>(`/devices${qs({ q: urlQ, supported: supported || undefined, page, limit: 20 })}`),
    placeholderData: (prev) => prev,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">INDEX</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Devices</h1>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Name, brand, codename or model number"
          aria-label="Filter devices"
          className="h-10 w-full max-w-md rounded border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={supported} onChange={(e) => update({ supported: e.target.checked ? 'true' : undefined, page: undefined })} />
          Supported only
        </label>
      </div>

      {isLoading && <LoadingSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.data.length === 0 && <EmptyState title="No devices match" hint="Try a codename such as “surya” or a model number prefix." />}
      {data && data.data.length > 0 && (
        <>
          <p className="mb-2 font-mono text-xs text-muted">{data.meta.total} RESULT{data.meta.total === 1 ? '' : 'S'}</p>
          <ul className="fade-in divide-y divide-line border-y border-line">
            {data.data.map((d) => (
              <li key={d._id}>
                <Link to={`/devices/${d.brandSlug}/${d.slug}`} className="flex items-center justify-between gap-4 py-3 transition-colors duration-150 hover:text-accent">
                  <span>
                    <span className="font-medium">{d.name}</span>
                    <span className="block text-xs text-muted">{d.brand}{d.chipset ? ` · ${d.chipset}` : ''}</span>
                  </span>
                  <Mono>{d.codename}</Mono>
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
