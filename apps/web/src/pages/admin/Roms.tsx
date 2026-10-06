import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiDelete, apiGetPage, apiPatch, apiPost, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDebounced, usePageMeta } from '../../lib/hooks';
import { zodResolver } from '../../lib/zodResolver';
import type { Rom } from '../../lib/types';
import { EmptyState, ErrorState, Field, LoadingSkeleton, Pagination, StatusBadge, buttonClass, inputClass, primaryButtonClass } from '../../components/ui';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';

const url = z.string().trim().refine((v) => !v || /^https?:\/\/\S+$/i.test(v), 'Must start with http(s)://');
const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(80),
  slug: z.string().trim().toLowerCase().min(1, 'Required').max(80).regex(/^[a-z0-9-]+$/, 'Lowercase letters, digits and dashes'),
  description: z.string().trim().max(2000),
  website: url, repository: url, documentation: url, telegramUrl: url, discordUrl: url,
  organization: z.string().trim().max(80),
  maintainer: z.string().trim().max(120),
  officialStatus: z.enum(['OFFICIAL', 'COMMUNITY', 'UNKNOWN']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'UNKNOWN']),
  supportedAndroidVersions: z.string(),
});
type Values = z.infer<typeof schema>;

const optional = (key: string, v: string) => (v ? { [key]: v } : {});
const toPayload = (v: Values) => ({
  name: v.name, slug: v.slug, officialStatus: v.officialStatus, status: v.status,
  supportedAndroidVersions: v.supportedAndroidVersions.split(',').map((x) => x.trim()).filter(Boolean),
  ...optional('description', v.description), ...optional('website', v.website), ...optional('repository', v.repository),
  ...optional('documentation', v.documentation), ...optional('telegramUrl', v.telegramUrl), ...optional('discordUrl', v.discordUrl),
  ...optional('organization', v.organization), ...optional('maintainer', v.maintainer),
});

function RomForm({ rom, onClose }: { rom: Rom | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver<Values>(schema),
    defaultValues: {
      name: rom?.name ?? '', slug: rom?.slug ?? '', description: rom?.description ?? '', website: rom?.website ?? '', repository: rom?.repository ?? '',
      documentation: rom?.documentation ?? '', telegramUrl: rom?.telegramUrl ?? '', discordUrl: rom?.discordUrl ?? '', organization: rom?.organization ?? '',
      maintainer: rom?.maintainer ?? '', officialStatus: rom?.officialStatus ?? 'UNKNOWN', status: rom?.status ?? 'UNKNOWN',
      supportedAndroidVersions: rom?.supportedAndroidVersions.join(', ') ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (v: Values) => (rom ? apiPatch(`/roms/${rom._id}`, toPayload(v)) : apiPost('/roms', toPayload(v))),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'roms'] }); onClose(); },
  });
  const link = (name: keyof Values, label: string) => <Field label={label} error={errors[name]?.message}><input className={inputClass} {...register(name)} /></Field>;
  return (
    <Modal title={rom ? `Edit ${rom.name}` : 'New ROM project'} onClose={onClose} wide>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message}><input className={inputClass} {...register('name')} /></Field>
        <Field label="Slug" error={errors.slug?.message}><input className={`${inputClass} font-mono`} {...register('slug')} /></Field>
        {link('website', 'Website')}{link('repository', 'Repository')}{link('documentation', 'Documentation')}{link('telegramUrl', 'Telegram')}{link('discordUrl', 'Discord')}
        <Field label="GitHub organization" error={errors.organization?.message}><input className={`${inputClass} font-mono`} {...register('organization')} /></Field>
        <Field label="Maintainer"><input className={inputClass} {...register('maintainer')} /></Field>
        <Field label="Android versions (comma separated)"><input className={inputClass} {...register('supportedAndroidVersions')} /></Field>
        <Field label="Official status"><select className={inputClass} {...register('officialStatus')}><option>OFFICIAL</option><option>COMMUNITY</option><option>UNKNOWN</option></select></Field>
        <Field label="Project status"><select className={inputClass} {...register('status')}><option>ACTIVE</option><option>INACTIVE</option><option>DISCONTINUED</option><option>UNKNOWN</option></select></Field>
        <div className="sm:col-span-2"><Field label="Description" error={errors.description?.message}><textarea rows={3} className={`${inputClass} h-auto py-2`} {...register('description')} /></Field></div>
        {save.isError && <p role="alert" className="text-sm text-accent sm:col-span-2">{save.error instanceof ApiError ? save.error.message : 'Could not save.'}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className={primaryButtonClass} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
          <button type="button" className={buttonClass} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Roms() {
  usePageMeta('ROMs · Admin');
  const isAdmin = useAuth((s) => s.user?.role === 'ADMIN');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q]);
  const [editing, setEditing] = useState<Rom | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Rom | null>(null);
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ['admin', 'roms', q, page], queryFn: () => apiGetPage<Rom>(`/roms${qs({ q, page, limit: 20 })}`), placeholderData: (p) => p });
  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/roms/${id}`),
    onSuccess: () => { setDeleting(null); void qc.invalidateQueries({ queryKey: ['admin'] }); },
  });

  return (
    <>
      <PageHeader title="ROM projects" hint="Add links, fix status, correct metadata. Changes are audit-logged." actions={<button className={primaryButtonClass} onClick={() => setEditing('new')}>New ROM</button>} />
      <input className={`${inputClass} mb-4 max-w-md`} placeholder="Search ROM projects" aria-label="Search ROMs" value={text} onChange={(e) => setText(e.target.value)} />
      {data.isLoading && <LoadingSkeleton rows={5} />}
      {data.isError && <ErrorState error={data.error} onRetry={() => data.refetch()} />}
      {data.data && data.data.data.length === 0 && <EmptyState title="No ROM projects match" />}
      {data.data && data.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>ROM</th><th className={th}>Status</th><th className={th}>Actions</th></tr></thead>
              <tbody>
                {data.data.data.map((r) => (
                  <tr key={r._id} className="border-b border-line last:border-0">
                    <td className={td}><Link to={`/roms/${r.slug}`} className="font-medium hover:text-accent">{r.name}</Link><p className="font-mono text-xs text-muted">{r.slug}</p></td>
                    <td className={td}><StatusBadge status={r.status} />{r.statusNote && <p className="mt-1 max-w-sm text-xs text-muted">{r.statusNote}</p>}</td>
                    <td className={td}><div className="flex gap-1">
                      <button className={buttonClass} onClick={() => setEditing(r)}>Edit</button>
                      {isAdmin && <button className={buttonClass} onClick={() => setDeleting(r)}>Delete</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pagination page={data.data.meta.page} pages={data.data.meta.pages} onPage={setPage} />
        </>
      )}
      {editing && <RomForm rom={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog title="Delete ROM project" danger confirmLabel="Delete" pending={del.isPending} error={del.error}
          message={<>Permanently delete <strong>{deleting.name}</strong> and all its device support records? This cannot be undone.</>}
          onConfirm={() => del.mutate(deleting._id)} onCancel={() => { setDeleting(null); del.reset(); }} />
      )}
    </>
  );
}
