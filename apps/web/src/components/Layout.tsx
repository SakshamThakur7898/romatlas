import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Search, Sun, User, X } from 'lucide-react';
import { useTheme } from '../useTheme';
import { useSearchStore } from '../lib/hooks';
import { isStaff, useAuth } from '../lib/auth';
import { NotificationBell } from './NotificationBell';
import { SearchCommand } from './SearchCommand';

const NAV = [
  { to: '/devices', label: 'Devices' },
  { to: '/roms', label: 'ROMs' },
  { to: '/guides', label: 'Guides' },
  { to: '/updates', label: 'Updates' },
  { to: '/assistant', label: 'Assistant' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors duration-150 ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`;

export function Layout() {
  const { dark, toggle } = useTheme();
  const setSearchOpen = useSearchStore((s) => s.setOpen);
  const [menu, setMenu] = useState(false);
  const { user, ready } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => setMenu(false), [pathname]);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-mono text-sm font-medium tracking-widest" aria-label="ROMAtlas home">
            ROM<span className="text-accent">/</span>ATLAS
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navClass}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-8 items-center gap-2 rounded border border-line px-2 text-sm text-muted transition-colors duration-150 hover:border-accent hover:text-ink"
              aria-label="Search"
            >
              <Search size={14} aria-hidden />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden font-mono text-[10px] sm:inline">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            {ready && isStaff(user) && <Link to="/admin" className="hidden h-8 items-center rounded border border-line px-3 font-mono text-xs text-accent transition-colors duration-150 hover:border-accent sm:flex">ADMIN</Link>}
            {ready && user && <NotificationBell />}
            {ready && (user ? (
              <Link to="/account" aria-label="Account" className="flex h-8 w-8 items-center justify-center rounded border border-line text-muted transition-colors duration-150 hover:text-ink"><User size={14} /></Link>
            ) : (
              <Link to="/login" className="hidden h-8 items-center rounded border border-line px-3 text-sm text-muted transition-colors duration-150 hover:border-accent hover:text-ink sm:flex">Sign in</Link>
            ))}
            <button onClick={toggle} aria-label="Toggle dark mode" className="flex h-8 w-8 items-center justify-center rounded border border-line text-muted transition-colors duration-150 hover:text-ink">
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu} className="flex h-8 w-8 items-center justify-center rounded border border-line md:hidden">
              {menu ? <X size={14} /> : <Menu size={14} />}
            </button>
          </div>
        </div>
        {menu && (
          <nav aria-label="Mobile" className="fade-in flex flex-col gap-4 border-t border-line px-4 py-4 md:hidden">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navClass}>{n.label}</NavLink>
            ))}
            {ready && (user ? <NavLink to="/bookmarks" className={navClass}>Bookmarks</NavLink> : <NavLink to="/login" className={navClass}>Sign in</NavLink>)}
          </nav>
        )}
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 font-mono text-xs text-muted">
          ROMATLAS INDEXES AND LINKS TO ORIGINAL SOURCES. IT HOSTS NO ROM FILES. ALWAYS VERIFY WITH THE MAINTAINER.
        </p>
      </footer>
      <SearchCommand />
    </div>
  );
}
