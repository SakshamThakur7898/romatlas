import type { ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink as ExtIcon, Inbox } from 'lucide-react';
import { ApiError } from '../lib/api';
import { freshness, type Tone } from '../lib/format';
import type { SupportType, Verification } from '../lib/types';

const TONE: Record<Tone, string> = {
  ok: 'border-teal-ink text-teal-ink',
  warn: 'border-accent text-accent',
  muted: 'border-line text-muted',
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-[3px] border px-1.5 py-0.5 font-mono text-[11px] uppercase leading-none tracking-wide ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function VerificationBadge({ status, lastVerifiedAt }: { status?: Verification; lastVerifiedAt?: string | null }) {
  const f = freshness(status, lastVerifiedAt);
  return <Badge tone={f.tone}>{f.text}</Badge>;
}

export function SupportBadge({ type }: { type: SupportType }) {
  return <Badge tone={type === 'OFFICIAL' ? 'ok' : 'muted'}>{type}</Badge>;
}

export function LifecycleBadge({ value }: { value?: 'ACTIVE' | 'DISCONTINUED' | 'UNKNOWN' }) {
  if (!value || value === 'UNKNOWN') return null;
  return <Badge tone={value === 'ACTIVE' ? 'ok' : 'warn'}>{value === 'ACTIVE' ? 'Active' : 'Discontinued'}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = status === 'ACTIVE' ? 'ok' : status === 'DISCONTINUED' ? 'warn' : 'muted';
  return <Badge tone={tone}>{status}</Badge>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[0.92em]">{children}</span>;
}

export function ExternalLink({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href || !/^https?:\/\//i.test(href)) return <span className="text-muted">Unavailable</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"
    >
      {children}
      <ExtIcon size={12} aria-hidden />
    </a>
  );
}

export const inputClass =
  'h-10 w-full rounded border border-line bg-surface px-3 text-sm outline-none transition-colors duration-150 focus:border-accent';

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-accent">{error}</span>}
    </label>
  );
}

export const buttonClass =
  'inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm transition-colors duration-150 enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-50';
export const primaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded bg-ink px-4 text-sm font-medium text-paper transition-opacity duration-150 enabled:hover:opacity-85 disabled:opacity-50';

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 border-b border-line pb-2 font-mono text-xs uppercase tracking-widest text-muted">{children}</h2>;
}

export function MetadataGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[10rem_1fr]">
      {items.map((i) => (
        <div key={i.label} className="contents">
          <dt className="font-mono text-xs uppercase tracking-wide text-muted">{i.label}</dt>
          <dd className="mb-2 break-words text-sm sm:mb-0">{i.value ?? 'Information currently unavailable.'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded border border-line bg-surface" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed border-line px-6 py-12 text-center">
      <Inbox size={20} className="text-muted" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-md text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong.';
  const offline = error instanceof ApiError && error.code === 'NETWORK_ERROR';
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded border border-line px-6 py-12 text-center">
      <AlertTriangle size={20} className="text-accent" aria-hidden />
      <p className="text-sm font-medium">{offline ? 'Network or API unavailable' : 'Request failed'}</p>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded border border-line px-3 py-1.5 text-sm transition-colors duration-150 hover:border-accent hover:text-accent">
          Retry
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = 'flex h-8 items-center gap-1 rounded border border-line px-2 text-sm transition-colors duration-150 enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-40';
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
      <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={14} aria-hidden /> Prev
      </button>
      <span className="font-mono text-xs text-muted">
        PAGE {page} / {pages}
      </span>
      <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next <ChevronRight size={14} aria-hidden />
      </button>
    </nav>
  );
}
