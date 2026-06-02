'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth-store';
import { API_URL } from './api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL;

type Handlers = Record<string, (payload: any) => void>;

/**
 * Connects to the backend Socket.io /realtime namespace authenticated with the
 * JWT and binds the provided event handlers for the component lifetime.
 */
export function useRealtime(handlers: Handlers) {
  const token = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token) return;
    const socket = io(`${WS_URL}/realtime`, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    const bound: Handlers = {};
    Object.keys(handlersRef.current).forEach((event) => {
      const fn = (payload: any) => handlersRef.current[event]?.(payload);
      bound[event] = fn;
      socket.on(event, fn);
    });

    return () => {
      Object.keys(bound).forEach((event) => socket.off(event, bound[event]));
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return socketRef;
}
