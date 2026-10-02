import { Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGetPage, qs } from '../lib/api';
import { usePageMeta } from '../lib/hooks';
import { dayLabel, timeAgo } from '../lib/format';
import type { UpdateEvent } from '../lib/types';
import { EmptyState, ErrorState, ExternalLink, LoadingSkeleton, Mono, Pagination } from '../components/ui';

export default function Updates() {
  usePageMeta('Updates', 'Recent source-detected changes across devices and ROM projects.');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['updates', page],
    queryFn: () => apiGetPage<UpdateEvent>(`/updates${qs({ page, limit: 30 })}`),
    placeholderData: (prev) => prev,
  });

  let lastDay = '';
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">FEED</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Recent changes</h1>
      {isLoading && <LoadingSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.data.length === 0 && <EmptyState title="No changes detected yet" hint="Updates appear here once source monitoring detects a change." />}
      {data && data.data.length > 0 && (
        <>
          <ul className="fade-in">
            {data.data.map((u) => {
              const day = dayLabel(u.detectedAt);
              const header = day !== lastDay ? day : null;
              lastDay = day;
              return (
                <Fragment key={u._id}>
                  {header && <li className="pb-2 pt-6 font-mono text-xs uppercase tracking-widest text-muted">{header}</li>}
                  <li className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 text-sm">
                    <span>
                      <span className="font-medium">{u.romId?.name ?? u.sourceId?.name ?? 'Source'}</span>
                      {u.deviceId && <> · <Link to={`/devices/${u.deviceId.brandSlug}/${u.deviceId.slug}`} className="hover:text-accent">{u.deviceId.name}</Link></>}
                      <span className="block text-xs text-muted">{u.updateType.replace(/_/g, ' ').toLowerCase()}{u.newValue && <> → <Mono>{u.newValue}</Mono></>}</span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted">{timeAgo(u.detectedAt)} <ExternalLink href={u.sourceUrl}>Source</ExternalLink></span>
                  </li>
                </Fragment>
              );
            })}
          </ul>
          <Pagination page={data.meta.page} pages={data.meta.pages} onPage={(p) => setParams(p > 1 ? { page: String(p) } : {}, { replace: true })} />
        </>
      )}
    </main>
  );
}
