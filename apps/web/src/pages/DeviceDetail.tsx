import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { usePageMeta } from '../lib/hooks';
import { timeAgo } from '../lib/format';
import type { Device, Guide, Kernel, Recovery, SupportWithRom, UpdateEvent } from '../lib/types';
import { CompatibilityTable } from '../components/CompatibilityTable';
import { EntityActions } from '../components/EntityActions';
import {
  Badge, EmptyState, ErrorState, ExternalLink, LoadingSkeleton, MetadataGrid, Mono, SectionTitle,
  StatusBadge, SupportBadge, VerificationBadge,
} from '../components/ui';

const TABS = ['overview', 'roms', 'recoveries', 'kernels', 'guides', 'updates', 'issues', 'sources'] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = {
  overview: 'Overview', roms: 'ROMs', recoveries: 'Recoveries', kernels: 'Kernels', guides: 'Guides',
  updates: 'Updates', issues: 'Known Issues', sources: 'Sources',
};

function useResource<T>(id: string, resource: string, enabled: boolean) {
  return useQuery({ queryKey: ['device', id, resource], queryFn: () => apiGet<T>(`/devices/${id}/${resource}`), enabled });
}

function Async({ q, empty, children }: { q: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; data?: unknown[] }; empty: string; children: React.ReactNode }) {
  if (q.isLoading) return <LoadingSkeleton rows={3} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data || q.data.length === 0) return <EmptyState title={empty} hint="ROMAtlas does not currently have verified information for this." />;
  return <div className="fade-in">{children}</div>;
}

function Overview({ d }: { d: Device }) {
  return (
    <section>
      <SectionTitle>Device overview</SectionTitle>
      {d.description && <p className="mb-6 max-w-2xl text-sm text-muted">{d.description}</p>}
      <MetadataGrid
        items={[
          { label: 'Chipset', value: d.chipset },
          { label: 'Architecture', value: d.architecture && <Mono>{d.architecture}</Mono> },
          { label: 'Models', value: d.modelNumbers.length ? <Mono>{d.modelNumbers.join(' / ')}</Mono> : undefined },
          { label: 'Aliases', value: d.aliases.length ? d.aliases.join(', ') : undefined },
          { label: 'Stock Android', value: d.currentAndroidVersion && <Mono>{d.currentAndroidVersion}</Mono> },
          { label: 'Bootloader', value: d.bootloaderInformation },
          { label: 'Official page', value: d.officialSource ? <ExternalLink href={d.officialSource}>Open</ExternalLink> : undefined },
        ]}
      />
    </section>
  );
}

function SourcesTab({ id }: { id: string }) {
  const roms = useResource<SupportWithRom[]>(id, 'roms', true);
  const recs = useResource<Recovery[]>(id, 'recoveries', true);
  const kernels = useResource<Kernel[]>(id, 'kernels', true);
  const guides = useResource<Guide[]>(id, 'guides', true);
  if ([roms, recs, kernels, guides].some((q) => q.isLoading)) return <LoadingSkeleton rows={3} />;
  const seen = new Map<string, string>();
  const add = (label: string, url?: string) => url && !seen.has(url) && seen.set(url, label);
  roms.data?.forEach((s) => { add(`${s.romId?.name ?? 'ROM'} (support source)`, s.sourceUrl); add(`${s.romId?.name ?? 'ROM'} (download)`, s.downloadUrl); add(`${s.romId?.name ?? 'ROM'} (documentation)`, s.documentationUrl); });
  recs.data?.forEach((r) => { add(`${r.name} (recovery)`, r.sourceUrl); add(`${r.name} (download)`, r.downloadUrl); });
  kernels.data?.forEach((k) => { add(`${k.name} (kernel repository)`, k.sourceRepository); add(`${k.name} (download)`, k.downloadUrl); });
  guides.data?.forEach((g) => add(`${g.title} (guide)`, g.sourceUrl));
  if (seen.size === 0) return <EmptyState title="No sources recorded" hint="Information currently unavailable." />;
  return (
    <ul className="fade-in divide-y divide-line border-y border-line">
      {[...seen].map(([url, label]) => (
        <li key={url} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span>{label}</span>
          <ExternalLink href={url}>{new URL(url).hostname}</ExternalLink>
        </li>
      ))}
    </ul>
  );
}

function IssuesTab({ id }: { id: string }) {
  const q = useResource<SupportWithRom[]>(id, 'roms', true);
  const withIssues = (q.data ?? []).filter((s) => s.knownIssues.length > 0);
  return (
    <Async q={{ ...q, data: q.isLoading ? undefined : withIssues }} empty="No known issues recorded">
      <ul className="space-y-4">
        {withIssues.map((s) => (
          <li key={s._id} className="rounded border border-line bg-surface p-4">
            <p className="mb-2 text-sm font-medium">{s.romId?.name} <Mono>Android {s.androidVersion}</Mono></p>
            <ul className="list-disc pl-5 text-sm text-muted">{s.knownIssues.map((i, n) => <li key={n}>{i}</li>)}</ul>
          </li>
        ))}
      </ul>
    </Async>
  );
}

export default function DeviceDetail() {
  const { brand = '', slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'overview';

  const device = useQuery({ queryKey: ['device', brand, slug], queryFn: () => apiGet<Device>(`/devices/lookup/${brand}/${slug}`) });
  const d = device.data;
  usePageMeta(d ? `${d.name} (${d.codename})` : 'Device', d ? `Custom ROMs, recoveries, kernels and guides for ${d.name} (${d.codename}).` : undefined);

  const id = d?._id ?? '';
  const ready = !!d;
  const roms = useResource<SupportWithRom[]>(id, 'roms', ready && tab === 'roms');
  const recs = useResource<Recovery[]>(id, 'recoveries', ready && tab === 'recoveries');
  const kernels = useResource<Kernel[]>(id, 'kernels', ready && tab === 'kernels');
  const guides = useResource<Guide[]>(id, 'guides', ready && tab === 'guides');
  const updates = useResource<UpdateEvent[]>(id, 'updates', ready && tab === 'updates');

  if (device.isLoading) return <main className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={5} /></main>;
  if (device.isError || !d) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState error={device.error} onRetry={() => device.refetch()} />
        <p className="mt-4 text-center text-sm"><Link to="/devices" className="text-accent hover:underline">← All devices</Link></p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-muted">{d.brand.toUpperCase()}{d.releaseDate ? ` · RELEASED ${new Date(d.releaseDate).getFullYear()}` : ''}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{d.name}</h1>
      <p className="mt-1 font-mono text-lg text-accent">{d.codename}</p>
      <EntityActions kind="device" id={d._id} name={`${d.name} (${d.codename})`} />

      <div role="tablist" aria-label="Device sections" className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors duration-150 ${tab === t ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {LABEL[t]}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-8">
        {tab === 'overview' && <Overview d={d} />}

        {tab === 'roms' && (
          <section>
            <SectionTitle>Custom ROM support</SectionTitle>
            <Async q={roms} empty="No ROMs listed for this device">
              <CompatibilityTable firstColumn="ROM" rows={(roms.data ?? []).map((s) => ({ kind: 'rom' as const, s }))} />
            </Async>
          </section>
        )}

        {tab === 'recoveries' && (
          <section>
            <SectionTitle>Recoveries</SectionTitle>
            <Async q={recs} empty="No recoveries listed for this device">
              <ul className="divide-y divide-line border-y border-line">
                {(recs.data ?? []).map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span><span className="font-medium">{r.name}</span> {r.version && <Mono>{r.version}</Mono>}</span>
                    <span className="flex items-center gap-3">
                      <SupportBadge type={r.supportType} />
                      <VerificationBadge status={r.lastVerifiedAt ? 'VERIFIED' : 'UNVERIFIED'} lastVerifiedAt={r.lastVerifiedAt} />
                      <ExternalLink href={r.sourceUrl}>Source</ExternalLink>
                    </span>
                  </li>
                ))}
              </ul>
            </Async>
          </section>
        )}

        {tab === 'kernels' && (
          <section>
            <SectionTitle>Kernels</SectionTitle>
            <Async q={kernels} empty="No kernels listed for this device">
              <ul className="divide-y divide-line border-y border-line">
                {(kernels.data ?? []).map((k) => (
                  <li key={k._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span><span className="font-medium">{k.name}</span> {k.version && <Mono>{k.version}</Mono>}{k.androidVersion && <span className="text-muted"> · Android <Mono>{k.androidVersion}</Mono></span>}</span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={k.status} />
                      <ExternalLink href={k.sourceRepository}>Repository</ExternalLink>
                    </span>
                  </li>
                ))}
              </ul>
            </Async>
          </section>
        )}

        {tab === 'guides' && (
          <section>
            <SectionTitle>Guides</SectionTitle>
            <Async q={guides} empty="No guides listed for this device">
              <ul className="divide-y divide-line border-y border-line">
                {(guides.data ?? []).map((g) => (
                  <li key={g._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span><span className="font-medium">{g.title}</span><span className="block text-xs text-muted">{g.category.replace(/_/g, ' ')}{g.difficulty ? ` · ${g.difficulty}` : ''}{g.estimatedTime ? ` · ${g.estimatedTime}` : ''}</span></span>
                    <span className="flex items-center gap-3">
                      {g.lastReviewedAt && <Badge>Reviewed {timeAgo(g.lastReviewedAt)}</Badge>}
                      <ExternalLink href={g.sourceUrl}>Original</ExternalLink>
                    </span>
                  </li>
                ))}
              </ul>
            </Async>
          </section>
        )}

        {tab === 'updates' && (
          <section>
            <SectionTitle>Recent changes</SectionTitle>
            <Async q={updates} empty="No updates detected yet">
              <ul className="divide-y divide-line border-y border-line">
                {(updates.data ?? []).map((u) => (
                  <li key={u._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>{u.romId?.name ?? 'Source'} · {u.updateType.replace(/_/g, ' ').toLowerCase()}{u.newValue && <> → <Mono>{u.newValue}</Mono></>}</span>
                    <span className="flex items-center gap-3 text-muted">{timeAgo(u.detectedAt)} <ExternalLink href={u.sourceUrl}>Source</ExternalLink></span>
                  </li>
                ))}
              </ul>
            </Async>
          </section>
        )}

        {tab === 'issues' && (<section><SectionTitle>Known issues</SectionTitle><IssuesTab id={d._id} /></section>)}
        {tab === 'sources' && (<section><SectionTitle>Sources</SectionTitle><SourcesTab id={d._id} /></section>)}
      </div>
    </main>
  );
}
