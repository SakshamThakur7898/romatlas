import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/hooks';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, MetadataGrid, SectionTitle, Mono, buttonClass } from '../components/ui';

interface Following {
  devices: { _id: string; name: string; brand: string; brandSlug: string; slug: string; codename: string }[];
  roms: { _id: string; name: string; slug: string }[];
}

export default function Account() {
  usePageMeta('Account');
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const following = useQuery({ queryKey: ['following'], queryFn: () => apiGet<Following>('/users/following') });
  if (!user) return null;

  const signOut = async () => {
    await logout();
    qc.clear();
    navigate('/');
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">ACCOUNT</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{user.name}</h1>
      <MetadataGrid items={[
        { label: 'Username', value: <Mono>{user.username}</Mono> },
        { label: 'Email', value: user.email },
        { label: 'Role', value: <Badge>{user.role}</Badge> },
      ]} />
      <div className="mt-6 flex gap-2">
        <Link to="/bookmarks" className={buttonClass}>Bookmarks</Link>
        <button className={buttonClass} onClick={signOut}>Sign out</button>
      </div>

      <section className="mt-10">
        <SectionTitle>Following</SectionTitle>
        {following.isLoading && <LoadingSkeleton rows={2} />}
        {following.isError && <ErrorState error={following.error} onRetry={() => following.refetch()} />}
        {following.data && following.data.devices.length + following.data.roms.length === 0 && (
          <EmptyState title="You are not following anything yet" hint="Follow a device or ROM to see its changes in the notification bell." />
        )}
        {following.data && following.data.devices.length + following.data.roms.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {following.data.devices.map((d) => (
              <li key={d._id}><Link className="flex justify-between py-3 text-sm hover:text-accent" to={`/devices/${d.brandSlug}/${d.slug}`}><span>{d.name}</span><Mono>{d.codename}</Mono></Link></li>
            ))}
            {following.data.roms.map((r) => (
              <li key={r._id}><Link className="flex justify-between py-3 text-sm hover:text-accent" to={`/roms/${r.slug}`}><span>{r.name}</span><span className="text-muted">ROM</span></Link></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
