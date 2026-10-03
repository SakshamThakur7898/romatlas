import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import type { UpdateEvent } from '../lib/types';

function readSeen(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/** Changes detected for followed devices/ROMs. "New" = detected after the panel was last opened. */
export function NotificationBell() {
  const userId = useAuth((s) => s.user?._id);
  const storageKey = `romatlas_notif_seen_${userId}`;
  const [seen, setSeen] = useState(() => readSeen(storageKey));
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<UpdateEvent[]>('/users/notifications'),
    refetchInterval: 120_000,
    enabled: !!userId,
  });
  const events = data ?? [];
  const unseen = events.filter((e) => new Date(e.detectedAt).getTime() > seen).length;

  const toggle = () => {
    if (!open) {
      const now = Date.now();
      setSeen(now);
      try { localStorage.setItem(storageKey, String(now)); } catch { /* storage unavailable */ }
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button onClick={toggle} aria-label={`Notifications${unseen ? `, ${unseen} new` : ''}`} aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded border border-line text-muted transition-colors duration-150 hover:text-ink">
        <Bell size={14} />
        {unseen > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-center font-mono text-[10px] text-paper">{unseen}</span>}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="fade-in absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface">
            <p className="border-b border-line px-3 py-2 font-mono text-xs uppercase tracking-widest text-muted">Changes you follow</p>
            {events.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">No recent changes for the devices and ROMs you follow.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                {events.map((e) => (
                  <li key={e._id} className="px-3 py-2 text-sm">
                    <p className="font-medium">{e.romId?.name ?? e.sourceId?.name ?? 'Source'}{e.deviceId && <span className="font-normal text-muted"> · {e.deviceId.name}</span>}</p>
                    <p className="text-xs text-muted">{e.updateType.replace(/_/g, ' ').toLowerCase()}{e.newValue ? `: ${e.newValue}` : ''} · {timeAgo(e.detectedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/updates" onClick={() => setOpen(false)} className="block border-t border-line px-3 py-2 text-center text-sm text-accent hover:underline">All updates</Link>
          </div>
        </>
      )}
    </div>
  );
}
