import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGetPage, apiPatch, qs } from '../../lib/api';
import { errorMessage, fmtDateTime, timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Pagination, buttonClass, inputClass } from '../../components/ui';
import { PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';

interface Report {
  _id: string; targetType: string; targetId: string; reason: string; description?: string; status: string; createdAt: string;
  userId?: { name: string; username: string } | null; target: { name: string; path: string } | null;
}
const STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];

export default function Reports() {
  usePageMeta('Reports · Admin');
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'reports', status, page], queryFn: () => apiGetPage<Report>(`/admin/reports${qs({ status, page, limit: 20 })}`), placeholderData: (p) => p });
  const act = useMutation({
    mutationFn: (v: { id: string; status: string }) => apiPatch(`/admin/reports/${v.id}/resolve`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  return (
    <>
      <PageHeader title="Reports" hint="Problems users flagged on devices and ROMs." actions={
        <select aria-label="Status" className={`${inputClass} w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>} />
      {act.isError && <p role="alert" className="mb-3 text-sm text-accent">{errorMessage(act.error)}</p>}
      {list.isLoading && <LoadingSkeleton rows={4} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.data && list.data.data.length === 0 && <EmptyState title={`No ${status.replace('_', ' ').toLowerCase()} reports`} />}
      {list.data && list.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>Report</th><th className={th}>Target</th><th className={th}>Reporter</th><th className={th}>Actions</th></tr></thead>
              <tbody>
                {list.data.data.map((r) => (
                  <tr key={r._id} className="border-b border-line last:border-0">
                    <td className={td}>
                      <Badge tone="warn">{r.reason.replace(/_/g, ' ')}</Badge>
                      {r.description && <p className="mt-2 max-w-sm whitespace-pre-wrap text-muted">{r.description}</p>}
                    </td>
                    <td className={td}>{r.target ? <Link to={r.target.path} className="text-accent hover:underline">{r.target.name}</Link> : <span className="text-muted">{r.targetType} (unavailable)</span>}</td>
                    <td className={td}>{r.userId ? `@${r.userId.username}` : '—'}<p className="text-xs text-muted" title={fmtDateTime(r.createdAt)}>{timeAgo(r.createdAt)}</p></td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {r.status === 'OPEN' && <button className={buttonClass} disabled={act.isPending} onClick={() => act.mutate({ id: r._id, status: 'IN_REVIEW' })}>Review</button>}
                        {(r.status === 'OPEN' || r.status === 'IN_REVIEW') && <>
                          <button className={buttonClass} disabled={act.isPending} onClick={() => act.mutate({ id: r._id, status: 'RESOLVED' })}>Resolve</button>
                          <button className={buttonClass} disabled={act.isPending} onClick={() => act.mutate({ id: r._id, status: 'DISMISSED' })}>Dismiss</button>
                        </>}
                        {(r.status === 'RESOLVED' || r.status === 'DISMISSED') && <Badge>{r.status}</Badge>}
                      </div>
                    </td>
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
