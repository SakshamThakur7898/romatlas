import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGetPage, qs } from '../lib/api';
import { timeAgo } from '../lib/format';
import { usePageMeta } from '../lib/hooks';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Mono, Pagination, inputClass } from '../components/ui';

export const GUIDE_CATEGORIES = ['BOOTLOADER', 'RECOVERY', 'ROM_INSTALLATION', 'ROOT', 'KERNEL', 'GAPPS', 'BACKUP', 'RESTORE', 'TROUBLESHOOTING', 'GENERAL'];
const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

interface GuideRow {
  _id: string; title: string; slug: string; category: string; difficulty?: string; estimatedTime?: string; lastReviewedAt?: string;
  deviceId: { name: string; codename: string; slug: string; brandSlug: string };
}

export default function Guides() {
  usePageMeta('Guides', 'Installation, recovery and troubleshooting guides linked to their original sources.');
  const [params, setParams] = useSearchParams();
  const category = GUIDE_CATEGORIES.includes(params.get('category') ?? '') ? (params.get('category') as string) : '';
  const difficulty = DIFFICULTIES.includes(params.get('difficulty') ?? '') ? (params.get('difficulty') as string) : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const update = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    setParams(sp, { replace: true });
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['guides', category, difficulty, page],
    queryFn: () => apiGetPage<GuideRow>(`/guides${qs({ category, difficulty, page, limit: 20 })}`),
    placeholderData: (p) => p,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">DOCUMENTATION</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Guides</h1>
      <div className="mb-6 flex flex-wrap gap-3">
        <select aria-label="Category" className={`${inputClass} w-auto`} value={category} onChange={(e) => update({ category: e.target.value || undefined, page: undefined })}>
          <option value="">Any category</option>
          {GUIDE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
        <select aria-label="Difficulty" className={`${inputClass} w-auto`} value={difficulty} onChange={(e) => update({ difficulty: e.target.value || undefined, page: undefined })}>
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      {isLoading && <LoadingSkeleton rows={5} />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.data.length === 0 && <EmptyState title="No guides match" hint="Guides appear here once they are added or approved from community submissions." />}
      {data && data.data.length > 0 && (
        <>
          <ul className="fade-in divide-y divide-line border-y border-line">
            {data.data.map((g) => (
              <li key={g._id}>
                <Link to={`/guides/${g.deviceId.slug}/${g.slug}`} className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors duration-150 hover:text-accent">
                  <span>
                    <span className="font-medium">{g.title}</span>
                    <span className="block text-xs text-muted">{g.deviceId.name} <Mono>{g.deviceId.codename}</Mono> · {g.category.replace(/_/g, ' ').toLowerCase()}{g.estimatedTime ? ` · ${g.estimatedTime}` : ''}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {g.difficulty && <Badge>{g.difficulty}</Badge>}
                    {g.lastReviewedAt && <span className="text-xs text-muted">reviewed {timeAgo(g.lastReviewedAt)}</span>}
                  </span>
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
