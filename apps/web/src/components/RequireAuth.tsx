import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoadingSkeleton } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={3} /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}
