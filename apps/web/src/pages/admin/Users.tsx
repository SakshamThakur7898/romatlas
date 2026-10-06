import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGetPage, apiPatch, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Pagination, inputClass } from '../../components/ui';
import { ConfirmDialog } from '../../components/Modal';
import { PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';

interface User { _id: string; name: string; username: string; email: string; role: string; verified: boolean; createdAt: string }
const ROLES = ['USER', 'CONTRIBUTOR', 'MODERATOR', 'ADMIN'];

export default function Users() {
  usePageMeta('Users · Admin');
  const me = useAuth((s) => s.user);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ user: User; role: string } | null>(null);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'users', page], queryFn: () => apiGetPage<User>(`/admin/users${qs({ page, limit: 25 })}`), placeholderData: (p) => p });
  const change = useMutation({
    mutationFn: (v: { id: string; role: string }) => apiPatch(`/admin/users/${v.id}/role`, { role: v.role }),
    onSuccess: () => { setPending(null); void qc.invalidateQueries({ queryKey: ['admin', 'users'] }); },
  });

  return (
    <>
      <PageHeader title="Users" hint={me?.role === 'ADMIN' ? 'Change roles with care: every change is audit-logged.' : 'Read-only for moderators.'} />
      {list.isLoading && <LoadingSkeleton rows={4} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No users" />}
      {list.data && list.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>User</th><th className={th}>Email</th><th className={th}>Joined</th><th className={th}>Role</th></tr></thead>
              <tbody>
                {list.data.data.map((u) => (
                  <tr key={u._id} className="border-b border-line last:border-0">
                    <td className={td}><p className="font-medium">{u.name}</p><p className="font-mono text-xs text-muted">@{u.username}</p></td>
                    <td className={td}>{u.email}</td>
                    <td className={td} title={fmtDateTime(u.createdAt)}>{timeAgo(u.createdAt)}</td>
                    <td className={td}>
                      {me?.role === 'ADMIN' && u._id !== me._id ? (
                        <select aria-label={`Role for ${u.username}`} className={`${inputClass} h-8 w-auto`} value={u.role} onChange={(e) => e.target.value !== u.role && setPending({ user: u, role: e.target.value })}>
                          {ROLES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      ) : <Badge>{u.role}{u._id === me?._id ? ' (you)' : ''}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pagination page={list.data.meta.page} pages={list.data.meta.pages} onPage={setPage} />
        </>
      )}
      {pending && (
        <ConfirmDialog title="Change role" danger confirmLabel={`Make ${pending.role}`} pending={change.isPending} error={change.error}
          message={<>Change <strong>@{pending.user.username}</strong> from {pending.user.role} to <strong>{pending.role}</strong>? It takes effect the next time their session refreshes.</>}
          onConfirm={() => change.mutate({ id: pending.user._id, role: pending.role })} onCancel={() => { setPending(null); change.reset(); }} />
      )}
    </>
  );
}
