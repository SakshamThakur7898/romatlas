import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Flag } from 'lucide-react';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { usePageMeta } from '../lib/hooks';
import { Markdown, headingsOf, parseBlocks } from '../lib/markdown';
import { GuideSidebar } from '../components/GuideSidebar';
import { ReportDialog } from '../components/ReportDialog';
import { Badge, ErrorState, ExternalLink, LoadingSkeleton, MetadataGrid, Mono, buttonClass } from '../components/ui';

interface GuideFull {
  _id: string; title: string; slug: string; category: string; difficulty?: string; estimatedTime?: string; content: string;
  sourceUrl: string; author?: string; lastReviewedAt?: string;
  deviceId: { name: string; brand: string; codename: string; slug: string; brandSlug: string };
  romId?: { name: string; slug: string } | null;
}

const STALE_AFTER_DAYS = 365;

function Source({ url, title }: { url: string; title: string }) {
  return (
    <aside className="rounded border border-line bg-surface p-4" aria-label="Source">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">Source</p>
      <p className="text-sm">{title}</p>
      <p className="mt-1 text-sm"><ExternalLink href={url}>Open the original instructions</ExternalLink></p>
    </aside>
  );
}

export default function GuidePage() {
  const { deviceSlug = '', guideSlug = '' } = useParams();
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [reporting, setReporting] = useState(false);
  const { data: g, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['guide', deviceSlug, guideSlug],
    queryFn: () => apiGet<GuideFull>(`/guides/${deviceSlug}/${guideSlug}`),
  });
  usePageMeta(g ? g.title : 'Guide', g ? `${g.title} for ${g.deviceId.name}, linked to its original source.` : undefined);

  if (isLoading) return <main className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={6} /></main>;
  if (isError || !g) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState error={error} onRetry={() => refetch()} />
        <p className="mt-4 text-center text-sm"><Link to="/guides" className="text-accent hover:underline">← All guides</Link></p>
      </main>
    );
  }
  const headings = headingsOf(parseBlocks(g.content));
  const stale = g.lastReviewedAt ? (Date.now() - new Date(g.lastReviewedAt).getTime()) / 86_400_000 > STALE_AFTER_DAYS : true;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-muted">{g.category.replace(/_/g, ' ')}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{g.title}</h1>
      <p className="mt-1 text-sm">
        <Link to={`/devices/${g.deviceId.brandSlug}/${g.deviceId.slug}`} className="text-accent hover:underline">{g.deviceId.name}</Link>{' '}
        <Mono>{g.deviceId.codename}</Mono>
        {g.romId && <> · <Link to={`/roms/${g.romId.slug}`} className="hover:text-accent">{g.romId.name}</Link></>}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="min-w-0 space-y-6">
          <MetadataGrid items={[
            { label: 'Difficulty', value: g.difficulty && <Badge>{g.difficulty}</Badge> },
            { label: 'Estimated time', value: g.estimatedTime },
            { label: 'Last reviewed', value: g.lastReviewedAt ? <>{timeAgo(g.lastReviewedAt)} {stale && <Badge tone="warn">Possibly outdated</Badge>}</> : <Badge tone="warn">Never reviewed</Badge> },
            { label: 'Author', value: g.author },
          ]} />
          <div role="note" className="flex gap-3 rounded border border-accent p-4 text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <p><strong>Important.</strong> Always verify the current instructions from the original maintainer before proceeding. Flashing can erase data or leave a device unusable.</p>
          </div>
          <Source url={g.sourceUrl} title="Original guide" />
          <article><Markdown source={g.content} /></article>
          <Source url={g.sourceUrl} title="Original guide (check it for changes since this summary)" />
          <button className={buttonClass} onClick={() => (user ? setReporting(true) : navigate(`/login?next=${encodeURIComponent(`/guides/${deviceSlug}/${guideSlug}`)}`))}>
            <Flag size={14} aria-hidden /> Report this guide
          </button>
        </div>
        <div className="order-first lg:order-none"><GuideSidebar headings={headings} /></div>
      </div>
      {reporting && <ReportDialog targetType="GUIDE" targetId={g._id} label={g.title} onClose={() => setReporting(false)} />}
    </main>
  );
}
