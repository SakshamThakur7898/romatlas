import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiDelete, apiGetPage, apiPatch, apiPost, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDebounced, usePageMeta } from '../../lib/hooks';
import { zodResolver } from '../../lib/zodResolver';
import type { Device } from '../../lib/types';
import { EmptyState, ErrorState, Field, LoadingSkeleton, Mono, Pagination, buttonClass, inputClass, primaryButtonClass } from '../../components/ui';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { PageHeader, TableWrap, td, th } from '../../components/admin/AdminUi';

const url = z.string().trim().refine((v) => !v || /^https?:\/\/\S+$/i.test(v), 'Must start with http(s)://');
const schema = z.object({
  brand: z.string().trim().min(1, 'Required').max(80),
  name: z.string().trim().min(1, 'Required').max(120),
  codename: z.string().trim().min(1, 'Required').max(60),
  modelNumbers: z.string(),
  aliases: z.string(),
  chipset: z.string().trim().max(80),
  architecture: z.enum(['', 'arm64', 'arm', 'x86_64', 'x86']),
  releaseDate: z.string(),
  officialSource: url,
  description: z.string().trim().max(2000),
  supported: z.boolean(),
});
type Values = z.infer<typeof schema>;

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const toPayload = (v: Values) => ({
  brand: v.brand, name: v.name, codename: v.codename, modelNumbers: list(v.modelNumbers), aliases: list(v.aliases), supported: v.supported,
  ...(v.chipset ? { chipset: v.chipset } : {}), ...(v.architecture ? { architecture: v.architecture } : {}),
  ...(v.releaseDate ? { releaseDate: v.releaseDate } : {}), ...(v.officialSource ? { officialSource: v.officialSource } : {}),
  ...(v.description ? { description: v.description } : {}),
});

function DeviceForm({ device, onClose }: { device: Device | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver<Values>(schema),
    defaultValues: {
      brand: device?.brand ?? '', name: device?.name ?? '', codename: device?.codename ?? '', modelNumbers: device?.modelNumbers.join(', ') ?? '',
      aliases: device?.aliases.join(', ') ?? '', chipset: device?.chipset ?? '', architecture: (device?.architecture as Values['architecture']) ?? '',
      releaseDate: device?.releaseDate?.slice(0, 10) ?? '', officialSource: device?.officialSource ?? '', description: device?.description ?? '', supported: device?.supported ?? true,
    },
  });
  const save = useMutation({
    mutationFn: (v: Values) => (device ? apiPatch(`/devices/${device._id}`, toPayload(v)) : apiPost('/devices', toPayload(v))),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'devices'] }); onClose(); },
  });
  return (
    <Modal title={device ? `Edit ${device.name}` : 'New device'} onClose={onClose} wide>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-3 sm:grid-cols-2">
        <Field label="Brand" error={errors.brand?.message}><input className={inputClass} {...register('brand')} /></Field>
        <Field label="Name" error={errors.name?.message}><input className={inputClass} {...register('name')} /></Field>
        <Field label="Codename" error={errors.codename?.message}><input className={`${inputClass} font-mono`} {...register('codename')} /></Field>
        <Field label="Chipset" error={errors.chipset?.message}><input className={inputClass} {...register('chipset')} /></Field>
        <Field label="Model numbers (comma separated)"><input className={`${inputClass} font-mono`} {...register('modelNumbers')} /></Field>
        <Field label="Aliases (comma separated)"><input className={inputClass} {...register('aliases')} /></Field>
        <Field label="Architecture"><select className={inputClass} {...register('architecture')}><option value="">—</option><option>arm64</option><option>arm</option><option>x86_64</option><option>x86</option></select></Field>
        <Field label="Release date"><input type="date" className={inputClass} {...register('releaseDate')} /></Field>
        <div className="sm:col-span-2"><Field label="Official page URL" error={errors.officialSource?.message}><input className={inputClass} {...register('officialSource')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description" error={errors.description?.message}><textarea rows={3} className={`${inputClass} h-auto py-2`} {...register('description')} /></Field></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" {...register('supported')} /> Supported</label>
        {save.isError && <p role="alert" className="text-sm text-accent sm:col-span-2">{save.error instanceof ApiError ? save.error.message : 'Could not save.'}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className={primaryButtonClass} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
          <button type="button" className={buttonClass} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Devices() {
  usePageMeta('Devices · Admin');
  const isAdmin = useAuth((s) => s.user?.role === 'ADMIN');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q]);
  const [editing, setEditing] = useState<Device | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Device | null>(null);
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ['admin', 'devices', q, page], queryFn: () => apiGetPage<Device>(`/devices${qs({ q, page, limit: 20 })}`), placeholderData: (p) => p });
  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/devices/${id}`),
    onSuccess: () => { setDeleting(null); void qc.invalidateQueries({ queryKey: ['admin'] }); },
  });

  return (
    <>
      <PageHeader title="Devices" hint="Create and correct device records. Changes are audit-logged." actions={<button className={primaryButtonClass} onClick={() => setEditing('new')}>New device</button>} />
      <input className={`${inputClass} mb-4 max-w-md`} placeholder="Search name, codename or model" aria-label="Search devices" value={text} onChange={(e) => setText(e.target.value)} />
      {data.isLoading && <LoadingSkeleton rows={5} />}
      {data.isError && <ErrorState error={data.error} onRetry={() => data.refetch()} />}
      {data.data && data.data.data.length === 0 && <EmptyState title="No devices match" />}
      {data.data && data.data.data.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full">
              <thead><tr className="border-b border-line"><th className={th}>Device</th><th className={th}>Codename</th><th className={th}>Models</th><th className={th}>Actions</th></tr></thead>
              <tbody>
                {data.data.data.map((d) => (
                  <tr key={d._id} className="border-b border-line last:border-0">
                    <td className={td}><Link to={`/devices/${d.brandSlug}/${d.slug}`} className="font-medium hover:text-accent">{d.name}</Link><p className="text-xs text-muted">{d.brand}</p></td>
                    <td className={td}><Mono>{d.codename}</Mono></td>
                    <td className={`${td} max-w-xs truncate font-mono text-xs`}>{d.modelNumbers.join(', ') || '—'}</td>
                    <td className={td}><div className="flex gap-1">
                      <button className={buttonClass} onClick={() => setEditing(d)}>Edit</button>
                      {isAdmin && <button className={buttonClass} onClick={() => setDeleting(d)}>Delete</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pagination page={data.data.meta.page} pages={data.data.meta.pages} onPage={setPage} />
        </>
      )}
      {editing && <DeviceForm device={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog title="Delete device" danger confirmLabel="Delete" pending={del.isPending} error={del.error}
          message={<>Permanently delete <strong>{deleting.name}</strong> and its ROM support, recovery, kernel and guide records? This cannot be undone.</>}
          onConfirm={() => del.mutate(deleting._id)} onCancel={() => { setDeleting(null); del.reset(); }} />
      )}
    </>
  );
}
