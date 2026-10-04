import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { usePageMeta } from '../lib/hooks';
import type { Rom, SupportWithDevice } from '../lib/types';
import { CompatibilityTable } from '../components/CompatibilityTable';
import { EntityActions } from '../components/EntityActions';
import {
  Badge, EmptyState, ErrorState, ExternalLink, LoadingSkeleton, MetadataGrid, SectionTitle, StatusBadge,
} from '../components/ui';

export default function RomDetail() {
  const { slug = '' } = useParams();
  const rom = useQuery({ queryKey: ['rom', slug], queryFn: () => apiGet<Rom>(`/roms/${slug}`) });
  const devices = useQuery({ queryKey: ['rom', slug, 'devices'], queryFn: () => apiGet<SupportWithDevice[]>(`/roms/${slug}/devices`), enabled: !!rom.data });
  const r = rom.data;
  usePageMeta(r ? r.name : 'ROM', r ? `Supported devices and source links for ${r.name}.` : undefined);

  if (rom.isLoading) return <main className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={5} /></main>;
  if (rom.isError || !r) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState error={rom.error} onRetry={() => rom.refetch()} />
        <p className="mt-4 text-center text-sm"><Link to="/roms" className="text-accent hover:underline">← All ROMs</Link></p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-muted">ROM PROJECT</p>
      <h1 className="text-3xl font-semibold tracking-tight">{r.name}</h1>
      <div className="mt-3 flex items-center gap-2"><Badge>{r.officialStatus}</Badge><StatusBadge status={r.status} /></div>
      {r.description && <p className="mt-4 max-w-2xl text-sm text-muted">{r.description}</p>}
      {r.statusNote && <p className="mt-3 max-w-2xl font-mono text-xs text-muted">{r.statusNote}</p>}
      <EntityActions kind="rom" id={r._id} name={r.name} />

      <section className="mt-10">
        <SectionTitle>Project</SectionTitle>
        <MetadataGrid
          items={[
            { label: 'Website', value: r.website ? <ExternalLink href={r.website}>Official website</ExternalLink> : undefined },
            { label: 'Repository', value: r.repository ? <ExternalLink href={r.repository}>Source code</ExternalLink> : undefined },
            { label: 'Documentation', value: r.documentation ? <ExternalLink href={r.documentation}>Documentation</ExternalLink> : undefined },
            { label: 'Telegram', value: r.telegramUrl ? <ExternalLink href={r.telegramUrl}>Community chat</ExternalLink> : undefined },
            { label: 'Discord', value: r.discordUrl ? <ExternalLink href={r.discordUrl}>Community server</ExternalLink> : undefined },
            { label: 'Maintainer', value: r.maintainer },
            { label: 'Android', value: r.supportedAndroidVersions.length ? r.supportedAndroidVersions.join(', ') : undefined },
          ]}
        />
      </section>

      <section className="mt-10">
        <SectionTitle>Device support</SectionTitle>
        {devices.isLoading && <LoadingSkeleton rows={3} />}
        {devices.isError && <ErrorState error={devices.error} onRetry={() => devices.refetch()} />}
        {devices.data && devices.data.length === 0 && <EmptyState title="No devices listed" hint="ROMAtlas does not currently have verified information for this." />}
        {devices.data && devices.data.length > 0 && (
          <div className="fade-in"><CompatibilityTable firstColumn="DEVICE" rows={devices.data.map((s) => ({ kind: 'device' as const, s }))} /></div>
        )}
      </section>
    </main>
  );
}
