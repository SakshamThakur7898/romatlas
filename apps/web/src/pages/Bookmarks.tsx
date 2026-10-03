import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { timeAgo } from '../lib/format';
import { usePageMeta } from '../lib/hooks';
import { useBookmark } from '../lib/userActions';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Mono, buttonClass } from '../components/ui';

interface BookmarkRow {
  targetType: string;
  targetId: string;
  createdAt: string;
  target: { name: string; slug: string; brandSlug?: string; codename?: string } | null;
}

function Row({ b }: { b: BookmarkRow }) {
  const remove = useBookmark(b.targetType === 'ROM' ? 'ROM' : 'DEVICE', b.targetId);
  const to = b.target ? (b.targetType === 'DEVICE' ? `/devices/${b.target.brandSlug}/${b.target.slug}` : `/roms/${b.target.slug}`) : null;
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="flex items-center gap-3">
        <Badge>{b.targetType}</Badge>
        {to && b.target ? <Link to={to} className="font-medium hover:text-accent">{b.target.name}</Link> : <span className="text-muted">No longer available</span>}
        {b.target?.codename && <Mono>{b.target.codename}</Mono>}
        <span className="text-xs text-muted">saved {timeAgo(b.createdAt)}</span>
      </span>
      <button className={buttonClass} disabled={remove.pending} onClick={remove.toggle}>Remove</button>
    </li>
  );
}

export default function Bookmarks() {
  usePageMeta('Bookmarks');
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['bookmarks'], queryFn: () => apiGet<BookmarkRow[]>('/users/bookmarks') });
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">SAVED</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Bookmarks</h1>
      {isLoading && <LoadingSkeleton rows={3} />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="Nothing bookmarked yet" hint="Use the Bookmark button on a device or ROM page." />}
      {data && data.length > 0 && <ul className="fade-in divide-y divide-line border-y border-line">{data.map((b) => <Row key={b.targetId} b={b} />)}</ul>}
    </main>
  );
}
