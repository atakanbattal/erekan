'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCheck,
  FileQuestion,
  FileText,
  Loader2,
  MessageSquare,
  Package,
  Truck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';
import type { NotificationType } from '@/lib/stages';
import type { PortalNotification } from '@/lib/portal/types-ext';

interface NotificationBellDropdownProps {
  variant?: 'customer' | 'admin';
  customerId?: string;
  unreadMessages: number;
  unreadNotifications: number;
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
    case 'stage_changed':
    case 'delivery_reminder':
    case 'delivery_overdue':
    case 'ndt_result':
      return Package;
    default:
      return Bell;
  }
}

export function NotificationBellDropdown({
  variant = 'customer',
  customerId,
  unreadMessages,
  unreadNotifications,
}: NotificationBellDropdownProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const refresh = useDebouncedRouterRefresh(2000);
  const supabase = createClient();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  const totalAlerts = unreadMessages + unreadNotifications;
  const notifHref = variant === 'admin' ? '/admin/notifications' : '/notifications';
  const messagesHref = variant === 'admin' ? '/admin/messages' : '/messages';

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('portal_notifications')
      .select('*')
      .eq('audience', variant === 'admin' ? 'admin' : 'customer')
      .order('created_at', { ascending: false })
      .limit(8);

    if (variant === 'customer' && customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data } = await query;
    setNotifications((data ?? []) as PortalNotification[]);
    setLoading(false);
  }, [customerId, variant]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function markAllRead() {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (unreadIds.length === 0) return;

    setMarking(true);
    await supabase.from('portal_notifications').update({ is_read: true }).in('id', unreadIds);
    setMarking(false);
    await loadNotifications();
    refresh();
  }

  async function markOneRead(id: string) {
    await supabase.from('portal_notifications').update({ is_read: true }).eq('id', id);
    refresh();
  }

  function handleNotificationClick(notification: PortalNotification) {
    if (!notification.is_read) void markOneRead(notification.id);
    setOpen(false);
    if (notification.link) router.push(notification.link);
  }

  const unreadInList = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="portal-topbar-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`portal-topbar-bell ${open ? 'portal-topbar-bell--active' : ''}`}
        aria-label={t('notifications.title')}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {totalAlerts > 0 && (
          <span className="portal-topbar-bell-dot">{totalAlerts > 9 ? '9+' : totalAlerts}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-header">
            <div>
              <h3 className="notification-dropdown-title">{t('notifications.title')}</h3>
              {totalAlerts > 0 && (
                <p className="notification-dropdown-summary">
                  {t('notifications.summary', {
                    messages: unreadMessages,
                    notifications: unreadNotifications,
                  })}
                </p>
              )}
            </div>
            {unreadInList > 0 && (
              <button
                type="button"
                className="notification-dropdown-mark-all"
                onClick={() => void markAllRead()}
                disabled={marking}
              >
                <CheckCheck size={14} />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {unreadMessages > 0 && (
            <Link
              href={messagesHref}
              className="notification-dropdown-messages"
              onClick={() => setOpen(false)}
            >
              <div className="notification-dropdown-messages-icon">
                <MessageSquare size={16} />
              </div>
              <div className="min-w-0">
                <div className="notification-dropdown-messages-title">
                  {t('notifications.unreadMessages')}
                </div>
                <div className="notification-dropdown-messages-desc">
                  {t('notifications.unreadMessagesDesc', { count: unreadMessages })}
                </div>
              </div>
              <span className="portal-sidebar-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
            </Link>
          )}

          <div className="notification-dropdown-section-label">{t('notifications.recent')}</div>

          {loading ? (
            <div className="notification-dropdown-loading">
              <Loader2 size={20} className="animate-spin text-arc-2" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="notification-dropdown-empty">{t('notifications.empty')}</p>
          ) : (
            <ul className="notification-dropdown-list">
              {notifications.map((notification) => {
                const Icon = notificationIcon(notification.type);
                const typeLabel = t(`notifications.types.${notification.type}` as 'notifications.types.message_reply');

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`notification-dropdown-item ${notification.is_read ? '' : 'notification-dropdown-item--unread'}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-dropdown-item-icon">
                        <Icon size={15} />
                      </div>
                      <div className="notification-dropdown-item-body min-w-0">
                        <div className="notification-dropdown-item-top">
                          <span className="notification-dropdown-item-type">{typeLabel}</span>
                          {!notification.is_read && (
                            <span className="notification-dropdown-item-unread">
                              {t('notifications.unread')}
                            </span>
                          )}
                        </div>
                        <div className="notification-dropdown-item-title">{notification.title}</div>
                        {notification.body && (
                          <p className="notification-dropdown-item-preview">{notification.body}</p>
                        )}
                        <div className="notification-dropdown-item-time">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="notification-dropdown-footer">
            <Link href={notifHref} className="notification-dropdown-view-all" onClick={() => setOpen(false)}>
              {t('notifications.viewAll')} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
