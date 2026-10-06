import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGetPage, apiPatch, qs } from '../../lib/api';
import { errorMessage, fmtDateTime, timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { Badge, EmptyState, ErrorState, ExternalLink, LoadingSkeleton, Mono, Pagination, buttonClass } from '../../components/ui';
import { PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';

interface Source { _id: string; name: string; url: string; type: string; reliabilityType: string; status: string; lastCheckedAt?: string; lastHttpStatus?: number; domain?: string }

export default function Sources() {
  usePageMeta('Sources · Admin');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'sources', page], queryFn: () => apiGetPage<Source>(`/admin/sources${qs({ page, limit: 20 })}`), placeholderData: (p) => p });
  const set = useMutation({
    mutationFn: (v: { id: string; status: 'ACTIVE' | 'OUTDATED' | 'DISABLED' }) => apiPatch(`/admin/sources/${v.id}`, { status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sources'] }),
  });
  const tone = (s: string) => (s === 'ACTIVE' ? 'ok' : s === 'CHECK_FAILED' || s === 'OUTDATED' ? 'warn' : 'muted');

  return (
    <>
      <PageHeader title="Sources" hint="Every record links back to one of these. Verify, mark outdated, or disable a source." />
      {set.isError && <p role="alert" className="mb-3 text-sm text-accent">{errorMessage(set.error)}</p>}
      {list.isLoading && <LoadingSkeleton rows={4} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No sources yet" hint="Run a sync to register sources." />}
      {list.data && list.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>Source</th><th className={th}>Classification</th><th className={th}>Last check</th><th className={th}>Status</th><th className={th}>Actions</th></tr></thead>
              <tbody>
                {list.data.data.map((s) => (
                  <tr key={s._id} className="border-b border-line last:border-0">
                    <td className={td}><p className="font-medium">{s.name}</p><ExternalLink href={s.url}>{s.domain ?? s.url}</ExternalLink></td>
                    <td className={td}><Badge>{s.type.replace(/_/g, ' ')}</Badge> <p className="mt-1 text-xs text-muted">{s.reliabilityType.replace(/_/g, ' ').toLowerCase()}</p></td>
                    <td className={td}><span title={fmtDateTime(s.lastCheckedAt)}>{timeAgo(s.lastCheckedAt)}</span><p className="text-xs text-muted">HTTP <Mono>{s.lastHttpStatus ?? '—'}</Mono></p></td>
                    <td className={td}><Badge tone={tone(s.status)}>{s.status.replace('_', ' ')}</Badge></td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        <button className={buttonClass} disabled={set.isPending || s.status === 'ACTIVE'} onClick={() => set.mutate({ id: s._id, status: 'ACTIVE' })}>Verify</button>
                        <button className={buttonClass} disabled={set.isPending || s.status === 'OUTDATED'} onClick={() => set.mutate({ id: s._id, status: 'OUTDATED' })}>Mark outdated</button>
                        <button className={buttonClass} disabled={set.isPending || s.status === 'DISABLED'} onClick={() => set.mutate({ id: s._id, status: 'DISABLED' })}>Disable</button>
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
