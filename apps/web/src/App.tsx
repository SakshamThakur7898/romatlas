import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth, RequireStaff } from './components/RequireAuth';
import { AdminLayout } from './components/admin/AdminLayout';
import { LoadingSkeleton } from './components/ui';
import { useAuth } from './lib/auth';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

// Audit logs are admin-only on the API too; this just avoids a dead screen for moderators.
function RequireAdmin({ children }: { children: ReactNode }) {
  const role = useAuth((s) => s.user?.role);
  return role === 'ADMIN' ? <>{children}</> : <Navigate to="/admin" replace />;
}

const Home = lazy(() => import('./pages/Home'));
const Devices = lazy(() => import('./pages/Devices'));
const DeviceDetail = lazy(() => import('./pages/DeviceDetail'));
const Roms = lazy(() => import('./pages/Roms'));
const RomDetail = lazy(() => import('./pages/RomDetail'));
const Updates = lazy(() => import('./pages/Updates'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Account = lazy(() => import('./pages/Account'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminDevices = lazy(() => import('./pages/admin/Devices'));
const AdminRoms = lazy(() => import('./pages/admin/Roms'));
const AdminSources = lazy(() => import('./pages/admin/Sources'));
const AdminSubmissions = lazy(() => import('./pages/admin/Submissions'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminSync = lazy(() => import('./pages/admin/SyncJobs'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminAudit = lazy(() => import('./pages/admin/AuditLogs'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  useEffect(() => {
    void useAuth.getState().bootstrap(); // restore the session from the refresh cookie
  }, []);
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={4} /></div>}>
      <Routes>
        <Route path="admin" element={<RequireStaff><AdminLayout /></RequireStaff>}>
          <Route index element={<AdminOverview />} />
          <Route path="devices" element={<AdminDevices />} />
          <Route path="roms" element={<AdminRoms />} />
          <Route path="sources" element={<AdminSources />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="sync" element={<AdminSync />} />
          <Route path="errors" element={<AdminSync failedOnly />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="audit" element={<RequireAdmin><AdminAudit /></RequireAdmin>} />
        </Route>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="devices" element={<Devices />} />
          <Route path="devices/:brand/:slug" element={<DeviceDetail />} />
          <Route path="roms" element={<Roms />} />
          <Route path="roms/:slug" element={<RomDetail />} />
          <Route path="updates" element={<Updates />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
