import { useEffect, type ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { buttonClass } from './ui';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={`fade-in mx-auto my-[8vh] w-[min(${wide ? '40rem' : '28rem'},calc(100%-2rem))] rounded-lg border border-line bg-surface p-5`}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, pending, error, onConfirm, onCancel }: {
  title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; pending?: boolean; error?: unknown;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="mb-4 text-sm text-muted">{message}</div>
      {error ? <p role="alert" className="mb-3 text-sm text-accent">{error instanceof ApiError ? error.message : 'Action failed.'}</p> : null}
      <div className="flex gap-2">
        <button onClick={onConfirm} disabled={pending}
          className={`inline-flex h-9 items-center rounded px-3 text-sm font-medium text-paper transition-opacity duration-150 enabled:hover:opacity-85 disabled:opacity-50 ${danger ? 'bg-accent' : 'bg-ink'}`}>
          {pending ? 'Working…' : confirmLabel}
        </button>
        <button onClick={onCancel} className={buttonClass}>Cancel</button>
      </div>
    </Modal>
  );
}
