import { create } from 'zustand';
import { apiGet, apiPost, refreshSession, setAccessToken } from './api';

export interface AuthUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: 'USER' | 'CONTRIBUTOR' | 'MODERATOR' | 'ADMIN';
  verified: boolean;
  followedDevices: string[];
  followedRoms: string[];
  bookmarks: { targetType: string; targetId: string }[];
}

interface AuthState {
  user: AuthUser | null;
  /** False until the first session restore attempt has finished. */
  ready: boolean;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  patchUser: (patch: Partial<AuthUser>) => void;
}

interface Session {
  user: AuthUser;
  accessToken: string;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  async bootstrap() {
    if (await refreshSession()) {
      try {
        set({ user: await apiGet<AuthUser>('/auth/me'), ready: true });
        return;
      } catch {
        /* fall through to signed-out */
      }
    }
    set({ user: null, ready: true });
  },
  async login(email, password) {
    const s = await apiPost<Session>('/auth/login', { email, password });
    setAccessToken(s.accessToken);
    set({ user: s.user });
  },
  async register(input) {
    const s = await apiPost<Session>('/auth/register', input);
    setAccessToken(s.accessToken);
    set({ user: s.user });
  },
  async logout() {
    try {
      await apiPost('/auth/logout');
    } finally {
      setAccessToken(null);
      set({ user: null });
    }
  },
  patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
}));

export const isStaff = (u: AuthUser | null) => u?.role === 'ADMIN' || u?.role === 'MODERATOR';
