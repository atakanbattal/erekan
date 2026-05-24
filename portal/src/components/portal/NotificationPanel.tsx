'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';
import type { NotificationAudience } from '@/lib/stages';
import type { PortalNotification } from '@/lib/portal/types-ext';
import { RealtimeProvider } from '@/components/portal/RealtimeProvider';

interface NotificationPanelProps {
  notifications: PortalNotification[];
  audience: NotificationAudience;
}

export function NotificationPanel({ notifications, audience }: NotificationPanelProps) {
  const { t, dateLocale } = useI18n();
  const refresh = useDebouncedRouterRefresh();
  const supabase = createClient();
  const [marking, setMarking] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setMarking(true);
    await supabase
      .from('portal_notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
    setMarking(false);
    refresh();
  }

  async function markOneRead(id: string) {
    await supabase.from('portal_notifications').update({ is_read: true }).eq('id', id);
    refresh();
  }

  return (
    <div className="card p-5" data-audience={audience}>
      <RealtimeProvider variant={audience === 'admin' ? 'admin' : 'customer'} />
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-arc-2" />
          <h3 className="font-bold text-bone">{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-arc-2/15 text-arc-2 border border-arc-2/25">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn-secondary text-xs flex items-center gap-1.5"
            onClick={markAllRead}
            disabled={marking}
          >
            <CheckCheck size={14} />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-steel-2 text-center py-6">{t('notifications.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-bone">{notification.title}</span>
                  {!notification.is_read && (
                    <span className="text-[10px] uppercase tracking-wide text-arc-2 shrink-0">
                      {t('notifications.unread')}
                    </span>
                  )}
                </div>
                {notification.body && (
                  <p className="text-xs text-steel-2 mt-1 line-clamp-2">{notification.body}</p>
                )}
                <div className="text-xs text-steel-2 mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </div>
              </>
            );

            const className = `block rounded border px-3 py-3 transition-colors ${
              notification.is_read
                ? 'border-ink-4 bg-ink-1/50'
                : 'border-arc-2/30 bg-arc-2/5 hover:bg-arc-2/10'
            }`;

            if (notification.link) {
              return (
                <li key={notification.id}>
                  <Link
                    href={notification.link}
                    className={className}
                    onClick={() => {
                      if (!notification.is_read) void markOneRead(notification.id);
                    }}
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={notification.id} className={className}>
                {content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
