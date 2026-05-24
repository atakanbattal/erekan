'use client';

import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface RealtimeProviderProps {
  variant: 'customer' | 'admin';
}

/** Lightweight realtime — only on pages that opt in (messages, notifications). */
export function RealtimeProvider({ variant }: RealtimeProviderProps) {
  useRealtimeRefresh(variant);
  return null;
}
