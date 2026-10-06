import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiGetPage, apiPost, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Pagination, buttonClass } from '../../components/ui';
import { PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';

interface Job { _id: string; name: string; status: string; startedAt: string; finishedAt?: string; stats?: Record<string, unknown>; error?: string; triggeredBy?: string }
const JOBS = ['all', 'google-devices', 'lineage-wiki', 'rom-projects'] as const;

const seconds = (j: Job) => (j.finishedAt ? `${Math.max(0, Math.round((+new Date(j.finishedAt) - +new Date(j.startedAt)) / 1000))}s` : '…');
const summary = (s?: Record<string, unknown>) => (s ? Object.entries(s).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : '');

export default function SyncJobs({ failedOnly = false }: { failedOnly?: boolean }) {
  usePageMeta(failedOnly ? 'Errors · Admin' : 'Sync Jobs · Admin');
  const isAdmin = useAuth((s) => s.user?.role === 'ADMIN');
  const [page, setPage] = useState(1);
  const [force, setForce] = useState(false);
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin', 'sync', failedOnly, page],
    queryFn: () => apiGetPage<Job>(`/admin/sync/history${qs({ page, limit: 20, status: failedOnly ? 'FAILED' : undefined })}`),
    placeholderData: (p) => p,
    // Poll while something is running so progress shows up without a manual refresh.
    refetchInterval: (q) => (q.state.data?.data.some((j) => j.status === 'RUNNING') ? 4000 : false),
  });
  const run = useMutation({
    mutationFn: (job: string) => apiPost('/admin/sync', { job, force }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'sync'] }); },
  });
  const running = list.data?.data.some((j) => j.status === 'RUNNING') ?? false;
  const tone = (s: string) => (s === 'SUCCESS' ? 'ok' : s === 'FAILED' ? 'warn' : 'muted');

  return (
    <>
      <PageHeader title={failedOnly ? 'Errors' : 'Sync jobs'} hint={failedOnly ? 'Failed synchronization runs.' : 'Importer runs from external sources.'} actions={
        isAdmin && !failedOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> force</label>
            {JOBS.map((j) => <button key={j} className={buttonClass} disabled={run.isPending || running} onClick={() => run.mutate(j)}>{j === 'all' ? 'Run all' : j}</button>)}
          </div>
        ) : undefined} />
      {run.isError && <p role="alert" className="mb-3 text-sm text-accent">{run.error instanceof ApiError ? run.error.message : 'Could not start the sync.'}</p>}
      {run.isSuccess && <p className="mb-3 text-sm text-muted">Sync started. This page updates while it runs.</p>}
      {list.isLoading && <LoadingSkeleton rows={4} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.data && list.data.data.length === 0 && <EmptyState title={failedOnly ? 'No failed runs' : 'No sync runs yet'} />}
      {list.data && list.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>Job</th><th className={th}>Status</th><th className={th}>Started</th><th className={th}>Took</th><th className={th}>Result</th></tr></thead>
              <tbody>
                {list.data.data.map((j) => (
                  <tr key={j._id} className="border-b border-line last:border-0">
                    <td className={`${td} font-mono`}>{j.name}<p className="text-xs text-muted">by {j.triggeredBy ?? '—'}</p></td>
                    <td className={td}><Badge tone={tone(j.status)}>{j.status}</Badge></td>
                    <td className={td} title={fmtDateTime(j.startedAt)}>{timeAgo(j.startedAt)}</td>
                    <td className={`${td} font-mono`}>{seconds(j)}</td>
                    <td className={`${td} max-w-md break-words font-mono text-xs ${j.error ? 'text-accent' : 'text-muted'}`}>{j.error ?? summary(j.stats)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pagination page={list.data.meta.page} pages={list.data.meta.pages} onPage={setPage} />
        </>
      )}
    </>
  );
}
