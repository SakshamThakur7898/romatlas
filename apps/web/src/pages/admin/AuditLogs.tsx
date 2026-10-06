import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGetPage, qs } from '../../lib/api';
import { fmtDateTime, timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Pagination, buttonClass } from '../../components/ui';
import { JsonBlock, PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';

interface Log { _id: string; action: string; targetType?: string; targetId?: string; previousValue?: unknown; newValue?: unknown; createdAt: string; actorId?: { name: string; username: string; role: string } | null }

export default function AuditLogs() {
  usePageMeta('Audit logs · Admin');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({ queryKey: ['admin', 'audit', page], queryFn: () => apiGetPage<Log>(`/admin/audit-logs${qs({ page, limit: 25 })}`), placeholderData: (p) => p });

  return (
    <>
      <PageHeader title="Audit logs" hint="Who changed what, and when. Previous and new values are kept." />
      {list.isLoading && <LoadingSkeleton rows={5} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No audit entries yet" />}
      {list.data && list.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>When</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Target</th><th className={th} /></tr></thead>
              <tbody>
                {list.data.data.map((l) => (
                  <Fragment key={l._id}>
                    <tr className="border-b border-line">
                      <td className={td} title={fmtDateTime(l.createdAt)}>{timeAgo(l.createdAt)}</td>
                      <td className={td}>{l.actorId ? `@${l.actorId.username}` : '—'}{l.actorId && <span className="ml-1 text-xs text-muted">{l.actorId.role}</span>}</td>
                      <td className={td}><Badge>{l.action.replace(/_/g, ' ')}</Badge></td>
                      <td className={`${td} font-mono text-xs`}>{l.targetType ?? '—'}</td>
                      <td className={td}>{(l.previousValue !== undefined || l.newValue !== undefined) && <button className={buttonClass} onClick={() => setOpen(open === l._id ? null : l._id)}>{open === l._id ? 'Hide' : 'Details'}</button>}</td>
                    </tr>
                    {open === l._id && (
                      <tr className="border-b border-line"><td colSpan={5} className="px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div><p className="mb-1 font-mono text-[11px] uppercase text-muted">Previous</p><JsonBlock value={l.previousValue} /></div>
                          <div><p className="mb-1 font-mono text-[11px] uppercase text-muted">New</p><JsonBlock value={l.newValue} /></div>
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
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
