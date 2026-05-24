'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';

const CUSTOMER_TABLES = ['portal_messages', 'portal_notifications'] as const;

const ADMIN_TABLES = ['portal_messages', 'portal_notifications', 'rfq_requests'] as const;

export function useRealtimeRefresh(variant: 'customer' | 'admin') {
  const scheduleRefresh = useDebouncedRouterRefresh(5000);

  useEffect(() => {
    const tables = variant === 'admin' ? ADMIN_TABLES : CUSTOMER_TABLES;
    const supabase = createClient();

    const channels = tables.map((table) =>
      supabase
        .channel(`portal-rt-${variant}-${table}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table },
          scheduleRefresh
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => {
        void supabase.removeChannel(ch);
      });
    };
  }, [variant, scheduleRefresh]);
}
