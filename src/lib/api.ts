'use client';

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth-store';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/v1/auth/refresh`, { refreshToken });
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clear();
    return null;
  }
}

// Refresh on 401 once.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshing) refreshing = doRefresh();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts a stable error code or message from an API error. */
export function apiError(err: unknown): { code?: string; message: string } {
  const ax = err as AxiosError<any>;
  const data = ax.response?.data;
  return {
    code: data?.code,
    message: data?.message || ax.message || 'Error',
  };
}
