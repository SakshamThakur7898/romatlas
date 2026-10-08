import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';

const SECTIONS: { label?: string; items: { to: string; label: string; end?: boolean; adminOnly?: boolean }[] }[] = [
  { items: [{ to: '/admin', label: 'Overview', end: true }] },
  { label: 'Content', items: [{ to: '/admin/devices', label: 'Devices' }, { to: '/admin/roms', label: 'ROMs' }, { to: '/admin/guides', label: 'Guides' }, { to: '/admin/sources', label: 'Sources' }] },
  { label: 'Moderation', items: [{ to: '/admin/submissions', label: 'Submissions' }, { to: '/admin/reports', label: 'Reports' }] },
  { label: 'System', items: [
    { to: '/admin/sync', label: 'Sync Jobs' }, { to: '/admin/errors', label: 'Errors' },
    { to: '/admin/users', label: 'Users' }, { to: '/admin/audit', label: 'Audit Logs', adminOnly: true },
  ] },
];

const link = ({ isActive }: { isActive: boolean }) =>
  `block border-l-2 px-4 py-1.5 font-mono text-xs uppercase tracking-wide transition-opacity duration-150 ${isActive ? 'border-accent opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`;

export function AdminLayout() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[14rem_1fr]">
      <div className="flex h-12 items-center justify-between border-b border-line px-4 md:hidden">
        <span className="font-mono text-xs tracking-widest">ADMIN CONSOLE</span>
        <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded border border-line">
          {open ? <X size={14} /> : <Menu size={14} />}
        </button>
      </div>
      <aside className={`${open ? 'block' : 'hidden'} bg-ink text-paper md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto`}>
        <div className="px-4 py-5">
          <p className="font-mono text-sm tracking-widest">ROM<span className="text-accent">/</span>ATLAS</p>
          <p className="mt-1 font-mono text-[10px] tracking-widest opacity-60">ADMIN CONSOLE</p>
        </div>
        <nav aria-label="Admin" className="pb-6">
          {SECTIONS.map((sec, i) => (
            <div key={i} className="mb-4">
              {sec.label && <p className="px-4 pb-1 font-mono text-[10px] uppercase tracking-widest opacity-40">{sec.label}</p>}
              {sec.items.filter((it) => !it.adminOnly || user?.role === 'ADMIN').map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={link}>{it.label}</NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-paper/20 px-4 py-4 text-xs">
          <p className="opacity-70">{user?.name} · <span className="font-mono">{user?.role}</span></p>
          <Link to="/" className="mt-2 inline-block text-accent hover:underline">← View site</Link>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl"><Outlet /></div>
      </main>
    </div>
  );
}
