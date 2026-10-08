import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ApiError, apiPost } from '../lib/api';
import { slugify } from '../lib/slug';
import type { Device, Rom } from '../lib/types';
import { zodResolver } from '../lib/zodResolver';
import { EntityPicker } from './EntityPicker';
import { Modal } from './Modal';
import { Field, buttonClass, inputClass, primaryButtonClass } from './ui';
import { GUIDE_CATEGORIES } from '../pages/Guides';

type SuggestType = 'DEVICE_ROM_SUPPORT' | 'RECOVERY' | 'KERNEL' | 'GUIDE';
const LABELS: Record<SuggestType, string> = {
  DEVICE_ROM_SUPPORT: 'A ROM build for this device',
  RECOVERY: 'A recovery',
  KERNEL: 'A kernel',
  GUIDE: 'A guide',
};

const optUrl = z.string().trim().refine((v) => !v || /^https?:\/\/\S+$/i.test(v), 'Must start with http(s)://');
const reqUrl = z.string().trim().min(1, 'A source link is required').refine((v) => /^https?:\/\/\S+$/i.test(v), 'Must start with http(s)://');
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

function Shell({ type, build, children, canSubmit }: {
  type: SuggestType; build: () => Record<string, unknown> | null; children: ReactNode; canSubmit: () => boolean;
}) {
  const [notes, setNotes] = useState('');
  const send = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost('/submissions', { type, payload, notes: notes.trim() || undefined }),
  });
  if (send.isSuccess) {
    return <p className="text-sm">Thank you. A moderator will review your suggestion. Once approved it appears marked as community-reported, never as verified.</p>;
  }
  return (
    <div className="space-y-3">
      {children}
      <Field label="Note for moderators (optional)"><textarea rows={2} className={`${inputClass} h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></Field>
      {send.isError && <p role="alert" className="text-sm text-accent">{send.error instanceof ApiError ? send.error.message : 'Could not send your suggestion.'}</p>}
      <button type="button" className={primaryButtonClass} disabled={send.isPending} onClick={() => { if (!canSubmit()) return; const p = build(); if (p) send.mutate(p); }}>
        {send.isPending ? 'Sending…' : 'Submit for review'}
      </button>
    </div>
  );
}

const supportSchema = z.object({
  supportType: z.enum(['COMMUNITY', 'UNOFFICIAL', 'UNKNOWN']), androidVersion: z.string().trim().min(1, 'Required').max(20),
  sourceUrl: reqUrl, downloadUrl: optUrl, documentationUrl: optUrl, maintainer: z.string().trim().max(120), notes: z.string().trim().max(2000),
});
type SupportValues = z.infer<typeof supportSchema>;

function SupportForm({ kind, id }: { kind: 'device' | 'rom'; id: string }) {
  const [other, setOther] = useState<(Device & Rom) | null>(null);
  const [pickError, setPickError] = useState<string>();
  const { register, getValues, trigger, formState: { errors } } = useForm<SupportValues>({ resolver: zodResolver<SupportValues>(supportSchema), defaultValues: { supportType: 'COMMUNITY', androidVersion: '', sourceUrl: '', downloadUrl: '', documentationUrl: '', maintainer: '', notes: '' } });
  return (
    <Shell type="DEVICE_ROM_SUPPORT"
      canSubmit={() => { if (!other) { setPickError(kind === 'device' ? 'Choose the ROM' : 'Choose the device'); void trigger(); return false; } setPickError(undefined); void trigger(); return Object.keys(errors).length === 0 && supportSchema.safeParse(getValues()).success; }}
      build={() => {
        const v = getValues();
        return clean({
          deviceId: kind === 'device' ? id : other?._id, romId: kind === 'device' ? other?._id : id, supportType: v.supportType, androidVersion: v.androidVersion.trim(),
          sourceUrl: v.sourceUrl.trim(), downloadUrl: v.downloadUrl.trim(), documentationUrl: v.documentationUrl.trim(), maintainer: v.maintainer.trim(), notes: v.notes.trim(),
        });
      }}>
      {kind === 'device'
        ? <EntityPicker<Rom & Device> label="ROM" path="/roms" render={(r) => r.name} value={other} onChange={setOther} error={pickError} />
        : <EntityPicker<Rom & Device> label="Device" path="/devices" render={(d) => `${d.name} (${d.codename})`} value={other} onChange={setOther} error={pickError} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Android version" error={errors.androidVersion?.message}><input className={inputClass} placeholder="15" {...register('androidVersion')} /></Field>
        <Field label="Support type"><select className={inputClass} {...register('supportType')}><option value="COMMUNITY">Community build</option><option value="UNOFFICIAL">Unofficial build</option><option value="UNKNOWN">Not sure</option></select></Field>
      </div>
      <Field label="Source link (required)" error={errors.sourceUrl?.message}><input className={inputClass} placeholder="Where this is announced or documented" {...register('sourceUrl')} /></Field>
      <Field label="Download link" error={errors.downloadUrl?.message}><input className={inputClass} {...register('downloadUrl')} /></Field>
      <Field label="Documentation link" error={errors.documentationUrl?.message}><input className={inputClass} {...register('documentationUrl')} /></Field>
      <Field label="Maintainer"><input className={inputClass} {...register('maintainer')} /></Field>
      <Field label="Notes"><textarea rows={2} className={`${inputClass} h-auto py-2`} {...register('notes')} /></Field>
    </Shell>
  );
}

const recoverySchema = z.object({
  name: z.string().trim().min(1, 'Required').max(80), version: z.string().trim().max(40), supportType: z.enum(['COMMUNITY', 'UNOFFICIAL', 'UNKNOWN']),
  sourceUrl: reqUrl, downloadUrl: optUrl, notes: z.string().trim().max(2000),
});
type RecoveryValues = z.infer<typeof recoverySchema>;

function RecoveryForm({ deviceId }: { deviceId: string }) {
  const { register, getValues, trigger, formState: { errors } } = useForm<RecoveryValues>({ resolver: zodResolver<RecoveryValues>(recoverySchema), defaultValues: { name: '', version: '', supportType: 'COMMUNITY', sourceUrl: '', downloadUrl: '', notes: '' } });
  return (
    <Shell type="RECOVERY" canSubmit={() => { void trigger(); return recoverySchema.safeParse(getValues()).success; }}
      build={() => { const v = getValues(); return clean({ deviceId, name: v.name.trim(), version: v.version.trim(), supportType: v.supportType, sourceUrl: v.sourceUrl.trim(), downloadUrl: v.downloadUrl.trim(), notes: v.notes.trim() }); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Recovery" error={errors.name?.message}><input className={inputClass} placeholder="OrangeFox, TWRP…" {...register('name')} /></Field>
        <Field label="Version"><input className={inputClass} {...register('version')} /></Field>
      </div>
      <Field label="Support type"><select className={inputClass} {...register('supportType')}><option value="COMMUNITY">Community build</option><option value="UNOFFICIAL">Unofficial build</option><option value="UNKNOWN">Not sure</option></select></Field>
      <Field label="Source link (required)" error={errors.sourceUrl?.message}><input className={inputClass} {...register('sourceUrl')} /></Field>
      <Field label="Download link" error={errors.downloadUrl?.message}><input className={inputClass} {...register('downloadUrl')} /></Field>
      <Field label="Notes"><textarea rows={2} className={`${inputClass} h-auto py-2`} {...register('notes')} /></Field>
    </Shell>
  );
}

const kernelSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(80), version: z.string().trim().max(40), androidVersion: z.string().trim().max(20),
  sourceRepository: reqUrl, downloadUrl: optUrl, maintainer: z.string().trim().max(120),
});
type KernelValues = z.infer<typeof kernelSchema>;

function KernelForm({ deviceId }: { deviceId: string }) {
  const { register, getValues, trigger, formState: { errors } } = useForm<KernelValues>({ resolver: zodResolver<KernelValues>(kernelSchema), defaultValues: { name: '', version: '', androidVersion: '', sourceRepository: '', downloadUrl: '', maintainer: '' } });
  return (
    <Shell type="KERNEL" canSubmit={() => { void trigger(); return kernelSchema.safeParse(getValues()).success; }}
      build={() => { const v = getValues(); return clean({ deviceId, name: v.name.trim(), version: v.version.trim(), androidVersion: v.androidVersion.trim(), sourceRepository: v.sourceRepository.trim(), downloadUrl: v.downloadUrl.trim(), maintainer: v.maintainer.trim() }); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kernel" error={errors.name?.message}><input className={inputClass} {...register('name')} /></Field>
        <Field label="Version"><input className={inputClass} {...register('version')} /></Field>
        <Field label="Android version"><input className={inputClass} {...register('androidVersion')} /></Field>
        <Field label="Maintainer"><input className={inputClass} {...register('maintainer')} /></Field>
      </div>
      <Field label="Source repository (required)" error={errors.sourceRepository?.message}><input className={inputClass} {...register('sourceRepository')} /></Field>
      <Field label="Download link" error={errors.downloadUrl?.message}><input className={inputClass} {...register('downloadUrl')} /></Field>
    </Shell>
  );
}

const guideSchema = z.object({
  title: z.string().trim().min(3, 'Give it a title').max(160), category: z.enum(GUIDE_CATEGORIES as [string, ...string[]]),
  difficulty: z.enum(['', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']), estimatedTime: z.string().trim().max(40), sourceUrl: reqUrl,
  content: z.string().trim().min(20, 'Add a short summary (at least 20 characters)').max(20000),
});
type GuideValues = z.infer<typeof guideSchema>;

function GuideForm({ deviceId }: { deviceId: string }) {
  const { register, getValues, trigger, formState: { errors } } = useForm<GuideValues>({ resolver: zodResolver<GuideValues>(guideSchema), defaultValues: { title: '', category: 'ROM_INSTALLATION', difficulty: '', estimatedTime: '', sourceUrl: '', content: '' } });
  return (
    <Shell type="GUIDE" canSubmit={() => { void trigger(); return guideSchema.safeParse(getValues()).success; }}
      build={() => {
        const v = getValues();
        return clean({ deviceId, title: v.title.trim(), slug: `${slugify(v.title) || 'guide'}-${Math.random().toString(36).slice(2, 6)}`, category: v.category, difficulty: v.difficulty, estimatedTime: v.estimatedTime.trim(), sourceUrl: v.sourceUrl.trim(), content: v.content.trim() });
      }}>
      <Field label="Title" error={errors.title?.message}><input className={inputClass} {...register('title')} /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Category"><select className={inputClass} {...register('category')}>{GUIDE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}</select></Field>
        <Field label="Difficulty"><select className={inputClass} {...register('difficulty')}><option value="">—</option><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select></Field>
        <Field label="Time"><input className={inputClass} placeholder="30–60 min" {...register('estimatedTime')} /></Field>
      </div>
      <Field label="Original guide link (required)" error={errors.sourceUrl?.message}><input className={inputClass} {...register('sourceUrl')} /></Field>
      <Field label="Short summary of the guide" error={errors.content?.message}><textarea rows={5} className={`${inputClass} h-auto py-2`} {...register('content')} /></Field>
    </Shell>
  );
}

/** Lets any signed-in user suggest additions. Nothing goes live until a moderator approves it. */
export function SuggestDialog({ kind, id, name, onClose }: { kind: 'device' | 'rom'; id: string; name: string; onClose: () => void }) {
  const types: SuggestType[] = kind === 'device' ? ['DEVICE_ROM_SUPPORT', 'RECOVERY', 'KERNEL', 'GUIDE'] : ['DEVICE_ROM_SUPPORT'];
  const [type, setType] = useState<SuggestType>(types[0]);
  return (
    <Modal title={`Suggest info for ${name}`} onClose={onClose} wide>
      <p className="mb-4 text-sm text-muted">Add links and details. Moderators review everything before it appears, and a source link is always required.</p>
      {types.length > 1 && (
        <div className="mb-4" role="radiogroup" aria-label="What are you adding?">
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button key={t} role="radio" aria-checked={type === t} onClick={() => setType(t)}
                className={`rounded border px-3 py-1.5 text-sm transition-colors duration-150 ${type === t ? 'border-accent text-accent' : 'border-line text-muted hover:text-ink'}`}>{LABELS[t]}</button>
            ))}
          </div>
        </div>
      )}
      <div key={type}>
        {type === 'DEVICE_ROM_SUPPORT' && <SupportForm kind={kind} id={id} />}
        {type === 'RECOVERY' && <RecoveryForm deviceId={id} />}
        {type === 'KERNEL' && <KernelForm deviceId={id} />}
        {type === 'GUIDE' && <GuideForm deviceId={id} />}
      </div>
      <button type="button" className={`${buttonClass} mt-4`} onClick={onClose}>Close</button>
    </Modal>
  );
}
