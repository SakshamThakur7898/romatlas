import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isStaff, useAuth } from '../lib/auth';
import { LoadingSkeleton } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={3} /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

/** Moderators and admins only. The API enforces this too; this just avoids showing dead screens. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={3} /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isStaff(user)) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-mono text-xs tracking-widest text-accent">403</p>
        <h1 className="mt-2 text-2xl font-semibold">Staff only</h1>
        <p className="mt-2 text-sm text-muted">Your account does not have access to the admin console.</p>
      </main>
    );
  }
  return <>{children}</>;
}
