import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGetPage, apiPatch, qs } from '../../lib/api';
import { errorMessage, timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { Badge, EmptyState, ErrorState, LoadingSkeleton, Pagination, buttonClass, inputClass } from '../../components/ui';
import { ConfirmDialog } from '../../components/Modal';
import { JsonBlock, PageHeader } from '../../components/admin/AdminUi';

interface Submission {
  _id: string; type: string; status: string; payload: Record<string, unknown>; notes?: string; reviewNotes?: string; createdAt: string;
  userId?: { name: string; username: string } | null;
}
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const label = (s: Submission) => String(s.payload.name ?? s.payload.title ?? s.type);

function Row({ s }: { s: Submission }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const review = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED') => apiPatch<{ created: { targetType: string } | null }>(`/admin/submissions/${s._id}/review`, { status, reviewNotes: note || undefined }),
    onSuccess: () => { setConfirm(false); void qc.invalidateQueries({ queryKey: ['admin'] }); },
  });
  return (
    <li className="rounded border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm"><Badge>{s.type}</Badge><span className="font-medium">{label(s)}</span>
          <span className="text-xs text-muted">by @{s.userId?.username ?? 'unknown'} · {timeAgo(s.createdAt)}</span></div>
        <div className="flex gap-1">
          <button className={buttonClass} onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'View'} payload</button>
          {s.status !== 'PENDING' && <Badge tone={s.status === 'APPROVED' ? 'ok' : 'warn'}>{s.status}</Badge>}
        </div>
      </div>
      {s.notes && <p className="mt-2 text-sm text-muted">“{s.notes}”</p>}
      {open && <div className="mt-3"><JsonBlock value={s.payload} /></div>}
      {s.status === 'PENDING' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className={`${inputClass} max-w-xs`} placeholder="Review note (optional)" aria-label="Review note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={buttonClass} disabled={review.isPending} onClick={() => setConfirm(true)}>Approve</button>
          <button className={buttonClass} disabled={review.isPending} onClick={() => review.mutate('REJECTED')}>Reject</button>
        </div>
      )}
      {s.reviewNotes && <p className="mt-2 text-xs text-muted">Review note: {s.reviewNotes}</p>}
      {review.isError && !confirm && <p role="alert" className="mt-2 text-sm text-accent">{errorMessage(review.error)}</p>}
      {confirm && (
        <ConfirmDialog title="Approve submission" confirmLabel="Approve and create" pending={review.isPending} error={review.error}
          message={<>This creates a real {s.type.toLowerCase()} record from the payload{s.type === 'GUIDE' ? ' and publishes it' : ''}. If it fails (for example a duplicate codename), the submission stays pending.</>}
          onConfirm={() => review.mutate('APPROVED')} onCancel={() => setConfirm(false)} />
      )}
    </li>
  );
}

export default function Submissions() {
  usePageMeta('Submissions · Admin');
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['admin', 'submissions', status, page], queryFn: () => apiGetPage<Submission>(`/admin/submissions${qs({ status, page, limit: 20 })}`), placeholderData: (p) => p });
  return (
    <>
      <PageHeader title="Submissions" hint="Contributor-submitted devices, ROMs and guides awaiting review." actions={
        <select aria-label="Status" className={`${inputClass} w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>} />
      {list.isLoading && <LoadingSkeleton rows={3} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.data && list.data.data.length === 0 && <EmptyState title={`No ${status.toLowerCase()} submissions`} />}
      {list.data && list.data.data.length > 0 && (
        <>
          <ul className="fade-in space-y-3">{list.data.data.map((s) => <Row key={s._id} s={s} />)}</ul>
          <Pagination page={list.data.meta.page} pages={list.data.meta.pages} onPage={setPage} />
        </>
      )}
    </>
  );
}
