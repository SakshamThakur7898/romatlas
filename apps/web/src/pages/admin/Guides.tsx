import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiDelete, apiGet, apiGetPage, apiPatch, apiPost, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { timeAgo } from '../../lib/format';
import { usePageMeta } from '../../lib/hooks';
import { zodResolver } from '../../lib/zodResolver';
import type { Device } from '../../lib/types';
import { Badge, EmptyState, ErrorState, Field, LoadingSkeleton, Pagination, buttonClass, inputClass, primaryButtonClass } from '../../components/ui';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { EntityPicker } from '../../components/EntityPicker';
import { PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';
import { GUIDE_CATEGORIES } from '../Guides';

interface GuideRow { _id: string; title: string; slug: string; category: string; status: string; updatedAt: string; lastReviewedAt?: string; deviceId?: { name: string; codename: string; brandSlug: string; slug: string } | null }
interface GuideFull extends GuideRow { content: string; sourceUrl: string; difficulty?: string; estimatedTime?: string; author?: string; deviceId?: { _id: string; name: string; codename: string; brandSlug: string; slug: string } | null }
const STATUSES = ['DRAFT', 'PUBLISHED', 'OUTDATED', 'ARCHIVED'];

const schema = z.object({
  title: z.string().trim().min(1, 'Required').max(160),
  slug: z.string().trim().toLowerCase().min(1, 'Required').max(120).regex(/^[a-z0-9-]+$/, 'Lowercase letters, digits and dashes'),
  category: z.enum(GUIDE_CATEGORIES as [string, ...string[]]),
  difficulty: z.enum(['', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  estimatedTime: z.string().trim().max(40),
  sourceUrl: z.string().trim().min(1, 'Required').refine((v) => /^https?:\/\/\S+$/i.test(v), 'Must start with http(s)://'),
  status: z.enum(STATUSES as [string, ...string[]]),
  content: z.string().min(1, 'Required').max(100000),
});
type Values = z.infer<typeof schema>;

function GuideForm({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ['admin', 'guide', id], queryFn: () => apiGet<GuideFull>(`/guides/${id}`), enabled: !!id });
  const [device, setDevice] = useState<Pick<Device, '_id' | 'name' | 'codename'> | null>(null);
  const [deviceError, setDeviceError] = useState<string>();
  const form = useForm<Values>({
    resolver: zodResolver<Values>(schema),
    values: existing.data
      ? { title: existing.data.title, slug: existing.data.slug, category: existing.data.category, difficulty: (existing.data.difficulty ?? '') as Values['difficulty'], estimatedTime: existing.data.estimatedTime ?? '', sourceUrl: existing.data.sourceUrl, status: existing.data.status, content: existing.data.content }
      : undefined,
    defaultValues: { title: '', slug: '', category: 'ROM_INSTALLATION', difficulty: '', estimatedTime: '', sourceUrl: '', status: 'DRAFT', content: '' },
  });
  const currentDevice = device ?? (existing.data?.deviceId ? { _id: existing.data.deviceId._id, name: existing.data.deviceId.name, codename: existing.data.deviceId.codename } : null);
  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = {
        title: v.title, slug: v.slug, category: v.category, sourceUrl: v.sourceUrl, status: v.status, content: v.content, deviceId: currentDevice?._id,
        ...(v.difficulty ? { difficulty: v.difficulty } : {}), ...(v.estimatedTime ? { estimatedTime: v.estimatedTime } : {}),
        ...(v.status === 'PUBLISHED' ? { lastReviewedAt: new Date().toISOString() } : {}),
      };
      return id ? apiPatch(`/guides/${id}`, body) : apiPost('/guides', body);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin'] }); onClose(); },
  });
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <Modal title={id ? 'Edit guide' : 'New guide'} onClose={onClose} wide>
      {id && existing.isLoading ? <LoadingSkeleton rows={3} /> : (
        <form onSubmit={handleSubmit((v) => { if (!currentDevice) { setDeviceError('Choose a device'); return; } setDeviceError(undefined); save.mutate(v); })} noValidate className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><EntityPicker<Pick<Device, '_id' | 'name' | 'codename'>> label="Device" path="/devices" render={(d) => `${d.name} (${d.codename})`} value={currentDevice} onChange={setDevice} error={deviceError} /></div>
          <Field label="Title" error={errors.title?.message}><input className={inputClass} {...register('title')} /></Field>
          <Field label="Slug" error={errors.slug?.message}><input className={`${inputClass} font-mono`} {...register('slug')} /></Field>
          <Field label="Category"><select className={inputClass} {...register('category')}>{GUIDE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}</select></Field>
          <Field label="Status"><select className={inputClass} {...register('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Difficulty"><select className={inputClass} {...register('difficulty')}><option value="">—</option><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select></Field>
          <Field label="Estimated time"><input className={inputClass} {...register('estimatedTime')} /></Field>
          <div className="sm:col-span-2"><Field label="Original source URL" error={errors.sourceUrl?.message}><input className={inputClass} {...register('sourceUrl')} /></Field></div>
          <div className="sm:col-span-2"><Field label="Content (Markdown: # headings, lists, `code`, [links](https://…))" error={errors.content?.message}><textarea rows={12} className={`${inputClass} h-auto py-2 font-mono text-xs`} {...register('content')} /></Field></div>
          {save.isError && <p role="alert" className="text-sm text-accent sm:col-span-2">{save.error instanceof ApiError ? save.error.message : 'Could not save.'}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={primaryButtonClass} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
            <button type="button" className={buttonClass} onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function AdminGuides() {
  usePageMeta('Guides · Admin');
  const isAdmin = useAuth((s) => s.user?.role === 'ADMIN');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [deleting, setDeleting] = useState<GuideRow | null>(null);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'guides', status, page], queryFn: () => apiGetPage<GuideRow>(`/admin/guides${qs({ status, page, limit: 20 })}`), placeholderData: (p) => p });
  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/guides/${id}`),
    onSuccess: () => { setDeleting(null); void qc.invalidateQueries({ queryKey: ['admin'] }); },
  });
  const tone = (s: string) => (s === 'PUBLISHED' ? 'ok' : s === 'OUTDATED' ? 'warn' : 'muted');

  return (
    <>
      <PageHeader title="Guides" hint="Drafts and published guides. Each must link to its original source." actions={
        <div className="flex gap-2">
          <select aria-label="Status" className={`${inputClass} w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <button className={primaryButtonClass} onClick={() => setEditing('new')}>New guide</button>
        </div>} />
      {list.isLoading && <LoadingSkeleton rows={4} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.data && list.data.data.length === 0 && <EmptyState title="No guides" />}
      {list.data && list.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>Guide</th><th className={th}>Device</th><th className={th}>Status</th><th className={th}>Updated</th><th className={th}>Actions</th></tr></thead>
              <tbody>
                {list.data.data.map((g) => (
                  <tr key={g._id} className="border-b border-line last:border-0">
                    <td className={td}>{g.status === 'PUBLISHED' && g.deviceId ? <Link className="font-medium hover:text-accent" to={`/guides/${g.deviceId.slug}/${g.slug}`}>{g.title}</Link> : <span className="font-medium">{g.title}</span>}<p className="text-xs text-muted">{g.category.replace(/_/g, ' ').toLowerCase()}</p></td>
                    <td className={td}>{g.deviceId ? `${g.deviceId.name}` : '—'}</td>
                    <td className={td}><Badge tone={tone(g.status)}>{g.status}</Badge></td>
                    <td className={td}>{timeAgo(g.updatedAt)}</td>
                    <td className={td}><div className="flex gap-1"><button className={buttonClass} onClick={() => setEditing(g._id)}>Edit</button>{isAdmin && <button className={buttonClass} onClick={() => setDeleting(g)}>Delete</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pagination page={list.data.meta.page} pages={list.data.meta.pages} onPage={setPage} />
        </>
      )}
      {editing && <GuideForm id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog title="Delete guide" danger confirmLabel="Delete" pending={del.isPending} error={del.error}
          message={<>Permanently delete <strong>{deleting.title}</strong>? This cannot be undone.</>}
          onConfirm={() => del.mutate(deleting._id)} onCancel={() => { setDeleting(null); del.reset(); }} />
      )}
    </>
  );
}
