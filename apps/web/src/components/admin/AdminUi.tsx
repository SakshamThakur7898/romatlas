import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const th = 'px-3 py-2 text-left font-mono text-[11px] font-normal uppercase tracking-wide text-muted';
export const td = 'px-3 py-2 align-top text-sm';

export function PageHeader({ title, hint, actions }: { title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <h1 className="font-mono text-lg font-medium uppercase tracking-wider">{title}</h1>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatTile({ label, value, to, alert }: { label: string; value?: number; to?: string; alert?: boolean }) {
  const body = (
    <div className={`rounded border bg-surface p-4 transition-colors duration-150 ${alert ? 'border-accent' : 'border-line'} ${to ? 'hover:border-accent' : ''}`}>
      <p className={`font-mono text-2xl ${alert ? 'text-accent' : ''}`}>{value === undefined ? '—' : value.toLocaleString()}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded border border-line bg-paper p-3 font-mono text-xs">
      {value === undefined ? '—' : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="fade-in overflow-x-auto rounded border border-line bg-surface">{children}</div>;
}
