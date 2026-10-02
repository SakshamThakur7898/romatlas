import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { apiGet } from '../lib/api';
import { usePageMeta, useSearchStore } from '../lib/hooks';
import type { PublicStats } from '../lib/types';

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <div className="border-l border-line pl-4">
      <p className="font-mono text-3xl">{value === undefined ? '—' : value.toLocaleString()}</p>
      <p className="mt-1 font-mono text-xs tracking-widest text-muted">{label}</p>
    </div>
  );
}

export default function Home() {
  usePageMeta('ROMAtlas', 'Find ROMs, recoveries, guides and device compatibility from source-linked information.');
  const setOpen = useSearchStore((s) => s.setOpen);
  const { data } = useQuery({ queryKey: ['stats'], queryFn: () => apiGet<PublicStats>('/stats') });

  return (
    <main>
      <section className="grid-texture border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-6 font-mono text-xs tracking-widest text-accent">DEVICE / ROM INTELLIGENCE</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            THE ANDROID
            <br />
            ECOSYSTEM, ORGANIZED.
          </h1>
          <p className="mt-6 max-w-lg text-muted">
            Find ROMs, recoveries, guides and device compatibility from source-linked information.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-10 flex h-12 w-full max-w-md items-center gap-3 rounded border border-line bg-surface px-4 text-left text-sm text-muted transition-colors duration-150 hover:border-accent"
          >
            <Search size={16} aria-hidden /> Search your device, codename or model…
          </button>
          <Link to="/devices" className="mt-4 inline-block text-sm text-accent hover:underline">Browse all devices →</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
        <Stat value={data?.devices} label="DEVICES" />
        <Stat value={data?.roms} label="ROM PROJECTS" />
        <Stat value={data?.guides} label="GUIDES" />
        <Stat value={data?.sources} label="SOURCES TRACKED" />
      </section>
    </main>
  );
}
