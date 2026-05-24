'use client';

import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface RealtimeProviderProps {
  variant: 'customer' | 'admin';
}

/** Mounts global realtime subscriptions — wired in PortalShell for all pages. */
export function RealtimeProvider({ variant }: RealtimeProviderProps) {
  useRealtimeRefresh(variant);
  return null;
}
