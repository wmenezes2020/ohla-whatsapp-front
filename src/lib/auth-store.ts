'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from './types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (data: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (data) =>
        set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'pf-auth' },
  ),
);
