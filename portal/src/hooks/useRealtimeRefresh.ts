'use client';

import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';

const CUSTOMER_TABLES = ['portal_messages', 'portal_notifications'] as const;

const ADMIN_TABLES = ['portal_messages', 'portal_notifications', 'rfq_requests'] as const;

type Variant = 'customer' | 'admin';

type SharedSubscription = {
  channel: RealtimeChannel;
  refCount: number;
  handlers: Set<() => void>;
};

const subscriptions = new Map<string, SharedSubscription>();

function channelKey(variant: Variant, table: string) {
  return `portal-rt-${variant}-${table}`;
}

function notifyHandlers(key: string) {
  const sub = subscriptions.get(key);
  if (!sub) return;
  sub.handlers.forEach((handler) => handler());
}

function acquireChannel(variant: Variant, table: string, handler: () => void) {
  const key = channelKey(variant, table);
  let sub = subscriptions.get(key);

  if (!sub) {
    const supabase = createClient();
    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        () => notifyHandlers(key)
      )
      .subscribe();

    sub = { channel, refCount: 0, handlers: new Set() };
    subscriptions.set(key, sub);
  }

  sub.handlers.add(handler);
  sub.refCount += 1;
  return key;
}

function releaseChannel(key: string, handler: () => void) {
  const sub = subscriptions.get(key);
  if (!sub) return;

  sub.handlers.delete(handler);
  sub.refCount -= 1;

  if (sub.refCount <= 0) {
    const supabase = createClient();
    void supabase.removeChannel(sub.channel);
    subscriptions.delete(key);
  }
}

export function useRealtimeRefresh(variant: 'customer' | 'admin') {
  const scheduleRefresh = useDebouncedRouterRefresh(5000);

  useEffect(() => {
    const tables = variant === 'admin' ? ADMIN_TABLES : CUSTOMER_TABLES;
    const keys = tables.map((table) => acquireChannel(variant, table, scheduleRefresh));

    return () => {
      keys.forEach((key) => releaseChannel(key, scheduleRefresh));
    };
  }, [variant, scheduleRefresh]);
}
