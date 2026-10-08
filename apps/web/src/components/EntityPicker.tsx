import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGetPage, qs } from '../lib/api';
import { useDebounced } from '../lib/hooks';
import { buttonClass, inputClass } from './ui';

/** Search-as-you-type selector for a device or ROM (server-side search, 8 results). */
export function EntityPicker<T extends { _id: string }>({ label, path, render, value, onChange, error }: {
  label: string; path: string; render: (t: T) => string; value: T | null; onChange: (t: T | null) => void; error?: string;
}) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 250);
  const { data, isFetching } = useQuery({
    queryKey: ['pick', path, q],
    queryFn: () => apiGetPage<T>(`${path}${qs({ q, limit: 8 })}`),
    enabled: q.length >= 2 && !value,
  });

  return (
    <div>
      <span className="mb-1 block font-mono text-xs uppercase tracking-wide text-muted">{label}</span>
      {value ? (
        <div className="flex items-center justify-between rounded border border-line bg-paper px-3 py-2 text-sm">
          <span>{render(value)}</span>
          <button type="button" className={buttonClass} onClick={() => { onChange(null); setText(''); }}>Change</button>
        </div>
      ) : (
        <>
          <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type to search…" aria-label={label} />
          {q.length >= 2 && (
            <ul className="mt-1 max-h-48 overflow-y-auto rounded border border-line bg-surface">
              {isFetching && !data && <li className="px-3 py-2 text-sm text-muted">Searching…</li>}
              {data?.data.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
              {data?.data.map((item) => (
                <li key={item._id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-paper hover:text-accent" onClick={() => onChange(item)}>{render(item)}</button></li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <span role="alert" className="mt-1 block text-xs text-accent">{error}</span>}
    </div>
  );
}
