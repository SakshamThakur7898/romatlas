import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ApiError, apiPost } from '../lib/api';
import { zodResolver } from '../lib/zodResolver';
import { Field, buttonClass, inputClass, primaryButtonClass } from './ui';

export const REPORT_REASONS = [
  ['BROKEN_LINK', 'Broken link'],
  ['OUTDATED_INFO', 'Outdated information'],
  ['INCORRECT_COMPATIBILITY', 'Incorrect compatibility'],
  ['WRONG_DEVICE_VARIANT', 'Wrong device variant'],
  ['INCORRECT_ROM_INFO', 'Incorrect ROM information'],
  ['GUIDE_OUTDATED', 'Guide outdated'],
  ['OTHER', 'Other'],
] as const;

const schema = z.object({
  reason: z.enum(REPORT_REASONS.map((r) => r[0]) as [string, ...string[]], { errorMap: () => ({ message: 'Choose a reason' }) }),
  description: z.string().trim().max(2000, 'Keep it under 2000 characters').optional(),
});
type FormValues = z.infer<typeof schema>;

export function ReportDialog({ targetType, targetId, label, onClose }: { targetType: 'DEVICE' | 'ROM' | 'GUIDE'; targetId: string; label: string; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver<FormValues>(schema) });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = useMutation({
    mutationFn: (v: FormValues) => apiPost('/reports', { targetType, targetId, reason: v.reason, description: v.description || undefined }),
    onSuccess: () => setSent(true),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Report information" onMouseDown={(e) => e.stopPropagation()}
        className="fade-in mx-auto mt-[12vh] w-[min(30rem,calc(100%-2rem))] rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-1 text-lg font-semibold">Report information</h2>
        <p className="mb-4 text-sm text-muted">{label}</p>
        {sent ? (
          <>
            <p className="mb-4 text-sm">Thanks. A moderator will review your report.</p>
            <button className={buttonClass} onClick={onClose}>Close</button>
          </>
        ) : (
          <form onSubmit={handleSubmit((v) => submit.mutate(v))} className="space-y-4" noValidate>
            <Field label="Reason" error={errors.reason?.message}>
              <select className={inputClass} defaultValue="" {...register('reason')}>
                <option value="" disabled>Select…</option>
                {REPORT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Details (optional)" error={errors.description?.message}>
              <textarea rows={4} className={`${inputClass} h-auto py-2`} {...register('description')} />
            </Field>
            {submit.isError && <p role="alert" className="text-sm text-accent">{submit.error instanceof ApiError ? submit.error.message : 'Could not send the report.'}</p>}
            <div className="flex gap-2">
              <button type="submit" className={primaryButtonClass} disabled={submit.isPending}>{submit.isPending ? 'Sending…' : 'Send report'}</button>
              <button type="button" className={buttonClass} onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
