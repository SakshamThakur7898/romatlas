import { useQuery } from '@tanstack/react-query';
import { apiGet, apiGetPage } from '../../lib/api';
import { fmtDateTime, timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { Badge, ErrorState, LoadingSkeleton } from '../../components/ui';
import { PageHeader, StatTile } from '../../components/admin/AdminUi';

interface Stats { devices: number; roms: number; guides: number; recoveries: number; kernels: number; sources: number; updates: number; users: number; openReports: number; pendingSubmissions: number }
interface Job { _id: string; name: string; status: string; startedAt: string; finishedAt?: string }

export default function Overview() {
  usePageMeta('Admin');
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => apiGet<Stats>('/admin/stats') });
  const jobs = useQuery({ queryKey: ['admin', 'sync', 'last'], queryFn: () => apiGetPage<Job>('/admin/sync/history?limit=1') });
  const s = stats.data;
  const last = jobs.data?.data[0];

  return (
    <>
      <PageHeader title="Overview" hint="Live counts from the database." />
      {stats.isLoading && <LoadingSkeleton rows={3} />}
      {stats.isError && <ErrorState error={stats.error} onRetry={() => stats.refetch()} />}
      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Open reports" value={s.openReports} to="/admin/reports" alert={s.openReports > 0} />
          <StatTile label="Pending submissions" value={s.pendingSubmissions} to="/admin/submissions" alert={s.pendingSubmissions > 0} />
          <StatTile label="Devices" value={s.devices} to="/admin/devices" />
          <StatTile label="ROM projects" value={s.roms} to="/admin/roms" />
          <StatTile label="Published guides" value={s.guides} />
          <StatTile label="Sources" value={s.sources} to="/admin/sources" />
          <StatTile label="Update events" value={s.updates} />
          <StatTile label="Users" value={s.users} to="/admin/users" />
        </div>
      )}
      <section className="mt-8">
        <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Latest sync</h2>
        {last ? (
          <p className="text-sm">
            <span className="font-mono">{last.name}</span> <Badge tone={last.status === 'FAILED' ? 'warn' : last.status === 'SUCCESS' ? 'ok' : 'muted'}>{last.status}</Badge>{' '}
            <span className="text-muted" title={fmtDateTime(last.startedAt)}>{timeAgo(last.startedAt)}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">No sync has run yet. Run one from Sync Jobs, or use the sync command.</p>
        )}
      </section>
    </>
  );
}
