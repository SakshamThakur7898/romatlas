import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { LoadingSkeleton } from './components/ui';
import { useAuth } from './lib/auth';

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
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  useEffect(() => {
    void useAuth.getState().bootstrap(); // restore the session from the refresh cookie
  }, []);
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><LoadingSkeleton rows={4} /></div>}>
      <Routes>
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
