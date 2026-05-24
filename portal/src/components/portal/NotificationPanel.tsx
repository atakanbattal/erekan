'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCheck,
  FileQuestion,
  FileText,
  MessageSquare,
  Package,
  Truck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';
import { ActivityStatusBadge } from '@/components/portal/ActivityStatusBadge';
import type { NotificationAudience, NotificationType } from '@/lib/stages';
import type { PortalNotification } from '@/lib/portal/types-ext';

interface NotificationPanelProps {
  notifications: PortalNotification[];
  audience: NotificationAudience;
}

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'message_reply':
    case 'support_request':
      return MessageSquare;
    case 'quote_ready':
    case 'rfq_submitted':
      return FileQuestion;
    case 'document_uploaded':
      return FileText;
    case 'shipment_updated':
      return Truck;
    default:
      return Package;
  }
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
      <div className="notification-panel-header">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-arc-2" />
          <h3 className="font-bold text-bone">{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <ActivityStatusBadge
              label={t('notifications.unreadCount', { count: unreadCount })}
              variant="unread"
              dot
            />
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn-secondary text-xs flex items-center gap-1.5"
            onClick={() => void markAllRead()}
            disabled={marking}
          >
            <CheckCheck size={14} />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="notification-panel-empty">{t('notifications.empty')}</p>
      ) : (
        <ul className="activity-list notification-panel-list">
          {notifications.map((notification) => {
            const Icon = notificationIcon(notification.type);
            const typeLabel = t(`notifications.types.${notification.type}` as 'notifications.types.message_reply');

            const content = (
              <>
                <div className="activity-list-item-icon">
                  <Icon size={18} />
                </div>
                <div className="activity-list-item-content min-w-0">
                  <div className="activity-list-item-top">
                    <span className="activity-list-item-type">{typeLabel}</span>
                    {!notification.is_read ? (
                      <ActivityStatusBadge label={t('notifications.unread')} variant="unread" dot />
                    ) : (
                      <ActivityStatusBadge label={t('notifications.read')} variant="muted" />
                    )}
                  </div>
                  <div className="activity-list-item-title">{notification.title}</div>
                  {notification.body && (
                    <p className="activity-list-item-preview">{notification.body}</p>
                  )}
                  <div className="activity-list-item-meta">
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                </div>
              </>
            );

            if (notification.link) {
              return (
                <li
                  key={notification.id}
                  className={`activity-list-item ${notification.is_read ? '' : 'activity-list-item--unread'}`}
                >
                  <Link
                    href={notification.link}
                    className="activity-list-item-main activity-list-item-main--link"
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
              <li
                key={notification.id}
                className={`activity-list-item ${notification.is_read ? '' : 'activity-list-item--unread'}`}
              >
                <div className="activity-list-item-main">{content}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
