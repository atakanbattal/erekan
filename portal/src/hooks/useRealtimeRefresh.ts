'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';

const CUSTOMER_TABLES = [
  'orders',
  'order_stages',
  'order_documents',
  'order_activity',
  'portal_messages',
  'portal_notifications',
  'ndt_records',
  'shipments',
  'rfq_requests',
] as const;

const ADMIN_TABLES = [
  ...CUSTOMER_TABLES,
  'customers',
  'customer_users',
] as const;

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
          { event: '*', schema: 'public', table },
          scheduleRefresh
        )
        .subscribe()
    );

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        scheduleRefresh();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      channels.forEach((ch) => {
        void supabase.removeChannel(ch);
      });
    };
  }, [variant, scheduleRefresh]);
}
