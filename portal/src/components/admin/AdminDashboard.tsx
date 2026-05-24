import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileQuestion,
  MessageSquare,
  Package,
  Timer,
  Truck,
  Users,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ActivityStatusBadge } from '@/components/portal/ActivityStatusBadge';
import { getServerI18n } from '@/lib/i18n/server';
import {
  formatDurationHours,
  type AdminDashboardMetrics,
} from '@/lib/portal/admin-dashboard-metrics';
import type { Order } from '@/lib/types';

interface AdminDashboardProps {
  metrics: AdminDashboardMetrics;
  recentOrders: (Order & { customers?: { company_name: string } | null })[];
}

function durationLabel(
  t: Awaited<ReturnType<typeof getServerI18n>>['t'],
  hours: number | null,
  emptyKey: 'admin.dashboard.noResponseData' | 'admin.dashboard.noQuoteData'
) {
  const formatted = formatDurationHours(hours);
  if (!formatted) return t(emptyKey);
  if (formatted.unit === 'minutes') {
    return t('admin.dashboard.durationMinutes', { value: formatted.value });
  }
  if (formatted.unit === 'hours') {
    return t('admin.dashboard.durationHours', { value: formatted.value });
  }
  return t('admin.dashboard.durationDays', { value: formatted.value });
}

export async function AdminDashboard({ metrics, recentOrders }: AdminDashboardProps) {
  const { t, dateLocale } = await getServerI18n();
  const { orders, customers, messages, rfq, notifications } = metrics;

  const kpiCards = [
    {
      href: '/admin/rfq',
      icon: FileQuestion,
      tone: 'arc',
      label: t('admin.dashboard.pendingRfq'),
      value: rfq.pendingCount,
      hint: t('admin.dashboard.pendingRfqHint', { quoted: rfq.quotedCount }),
      alert: rfq.pendingCount > 0,
    },
    {
      href: '/admin/messages',
      icon: MessageSquare,
      tone: 'danger',
      label: t('admin.dashboard.awaitingMessages'),
      value: messages.awaitingReplyCount,
      hint: t('admin.dashboard.awaitingMessagesHint', {
        unread: messages.unreadCount,
        support: messages.supportPending,
      }),
      alert: messages.awaitingReplyCount > 0,
    },
    {
      href: '/admin/messages',
      icon: Timer,
      tone: 'blue',
      label: t('admin.dashboard.avgResponseTime'),
      value: durationLabel(t, messages.avgResponseHours, 'admin.dashboard.noResponseData'),
      hint: t('admin.dashboard.avgResponseHint', { count: messages.sampleSize }),
      alert: false,
      isText: true,
    },
    {
      href: '/admin/rfq',
      icon: Clock3,
      tone: 'purple',
      label: t('admin.dashboard.avgQuoteTime'),
      value: durationLabel(t, rfq.avgQuoteResponseHours, 'admin.dashboard.noQuoteData'),
      hint: t('admin.dashboard.avgQuoteHint', { count: rfq.quoteSampleSize }),
      alert: false,
      isText: true,
    },
    {
      href: '/admin/orders',
      icon: Package,
      tone: 'blue',
      label: t('admin.dashboard.activeOrders'),
      value: orders.active,
      hint: t('admin.dashboard.activeOrdersHint', {
        progress: orders.avgStageProgress,
        ready: orders.readyShipment,
      }),
      alert: false,
    },
    {
      href: '/admin/orders',
      icon: AlertTriangle,
      tone: 'danger',
      label: t('admin.dashboard.overdueOrders'),
      value: orders.overdue,
      hint: t('admin.dashboard.overdueOrdersHint', { dueWeek: orders.dueThisWeek }),
      alert: orders.overdue > 0,
    },
    {
      href: '/admin/customers',
      icon: Users,
      tone: 'green',
      label: t('admin.dashboard.customers'),
      value: customers.total,
      hint: t('admin.dashboard.customersHint', { active: customers.active }),
      alert: false,
    },
    {
      href: '/admin/notifications',
      icon: CheckCircle2,
      tone: 'amber',
      label: t('admin.dashboard.unreadNotifications'),
      value: notifications.unreadCount,
      hint: t('admin.dashboard.unreadNotificationsHint'),
      alert: notifications.unreadCount > 0,
    },
  ];

  return (
    <>
      <div className="admin-dashboard-kpi-grid mb-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`admin-dashboard-kpi-card admin-dashboard-kpi-card--${card.tone} ${card.alert ? 'admin-dashboard-kpi-card--alert' : ''}`}
            >
              <div className="admin-dashboard-kpi-top">
                <div className="admin-dashboard-kpi-icon">
                  <Icon size={18} />
                </div>
                {card.alert && <span className="admin-dashboard-kpi-alert-dot" />}
              </div>
              <div className={`admin-dashboard-kpi-value ${card.isText ? 'admin-dashboard-kpi-value--text' : ''}`}>
                {card.value}
              </div>
              <div className="admin-dashboard-kpi-label">{card.label}</div>
              <div className="admin-dashboard-kpi-hint">{card.hint}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <section className="card admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2 className="font-bold text-bone">{t('admin.dashboard.actionMessagesTitle')}</h2>
              <p className="text-sm text-steel-2 mt-1">{t('admin.dashboard.actionMessagesDesc')}</p>
            </div>
            <Link href="/admin/messages" className="text-sm text-arc-2 hover:underline shrink-0">
              {t('admin.viewAll')} →
            </Link>
          </div>
          {messages.recentAwaiting.length === 0 ? (
            <p className="admin-dashboard-panel-empty">{t('admin.dashboard.noAwaitingMessages')}</p>
          ) : (
            <ul className="activity-list">
              {messages.recentAwaiting.map((thread) => (
                <li
                  key={thread.threadId}
                  className={`activity-list-item ${thread.unread ? 'activity-list-item--unread' : ''}`}
                >
                  <Link href="/admin/messages" className="activity-list-item-main activity-list-item-main--link">
                    <div className="activity-list-item-icon">
                      <MessageSquare size={18} />
                    </div>
                    <div className="activity-list-item-content min-w-0">
                      <div className="activity-list-item-top">
                        <span className="activity-list-item-title">{thread.subject}</span>
                        <ActivityStatusBadge
                          label={
                            thread.unread
                              ? t('messages.statusUnread')
                              : t('messages.statusAwaitingReply')
                          }
                          variant={thread.unread ? 'unread' : 'awaiting'}
                          dot={thread.unread}
                        />
                      </div>
                      <p className="activity-list-item-preview">{thread.preview}</p>
                      <div className="activity-list-item-meta">
                        <span>{thread.companyName}</span>
                        <span>{t(`messages.categories.${thread.category as 'general'}`)}</span>
                        <span>
                          {formatDistanceToNow(new Date(thread.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2 className="font-bold text-bone">{t('admin.dashboard.actionRfqTitle')}</h2>
              <p className="text-sm text-steel-2 mt-1">{t('admin.dashboard.actionRfqDesc')}</p>
            </div>
            <Link href="/admin/rfq" className="text-sm text-arc-2 hover:underline shrink-0">
              {t('admin.viewRfq')} →
            </Link>
          </div>
          {rfq.recentPending.length === 0 ? (
            <p className="admin-dashboard-panel-empty">{t('admin.dashboard.noPendingRfq')}</p>
          ) : (
            <ul className="activity-list">
              {rfq.recentPending.map((item) => (
                <li key={item.id} className="activity-list-item activity-list-item--action">
                  <Link href="/admin/rfq" className="activity-list-item-main activity-list-item-main--link">
                    <div className="activity-list-item-icon">
                      <FileQuestion size={18} />
                    </div>
                    <div className="activity-list-item-content min-w-0">
                      <div className="activity-list-item-top">
                        <span className="activity-list-item-title">{item.title}</span>
                        <ActivityStatusBadge
                          label={t(`adminRfqPage.status.${item.status}`)}
                          variant={item.status === 'reviewing' ? 'awaiting' : 'pending'}
                        />
                      </div>
                      <div className="activity-list-item-meta">
                        <span>{item.companyName}</span>
                        <span>
                          {format(new Date(item.createdAt), 'd MMM yyyy HH:mm', { locale: dateLocale })}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 border-l-4 border-l-danger">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-danger" />
            <h3 className="font-bold text-bone">{t('admin.overdueOrders')}</h3>
            <span className="ml-auto text-2xl font-black text-danger">{orders.overdue}</span>
          </div>
          <p className="text-sm text-steel-2">{t('admin.dashboard.overdueOrdersHint', { dueWeek: orders.dueThisWeek })}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={18} className="text-amber-400" />
            <h3 className="font-bold text-bone">{t('admin.dueThisWeek')}</h3>
            <span className="ml-auto text-2xl font-black text-amber-400">{orders.dueThisWeek}</span>
          </div>
          <p className="text-sm text-steel-2">{t('admin.dashboard.dueThisWeekDesc')}</p>
        </div>
        <div className="card p-5 border-l-4 border-l-success">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={18} className="text-success" />
            <h3 className="font-bold text-bone">{t('admin.dashboard.readyShipment')}</h3>
            <span className="ml-auto text-2xl font-black text-success">{orders.readyShipment}</span>
          </div>
          <p className="text-sm text-steel-2">{t('admin.dashboard.readyShipmentDesc')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-1">
          <h3 className="font-bold text-bone mb-4">{t('admin.dashboard.orderStatusTitle')}</h3>
          <ul className="admin-dashboard-status-list">
            <li><span>{t('orderStatus.active')}</span><strong>{orders.active}</strong></li>
            <li><span>{t('orderStatus.on_hold')}</span><strong>{orders.onHold}</strong></li>
            <li><span>{t('orderStatus.shipped')}</span><strong>{orders.shipped}</strong></li>
            <li><span>{t('orderStatus.completed')}</span><strong>{orders.completed}</strong></li>
            <li><span>{t('orderStatus.draft')}</span><strong>{orders.draft}</strong></li>
          </ul>
        </div>

        <div className="card lg:col-span-2">
          <div className="p-5 border-b border-ink-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-bone">{t('admin.recentOrders')}</h2>
              <p className="text-sm text-steel-2 mt-1">{t('admin.dashboard.recentOrdersDesc')}</p>
            </div>
            <Link href="/admin/orders" className="text-sm text-arc-2 hover:underline shrink-0">
              {t('admin.viewAll')}
            </Link>
          </div>
          <div className="divide-y divide-ink-4">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-steel-2">{t('admin.noOrders')}</div>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-ink-3/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-arc-2">{order.job_number}</div>
                    <div className="font-medium text-bone truncate">{order.title}</div>
                    <div className="text-xs text-steel-2">{order.customers?.company_name}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-steel-2">
                      {t('order.stageProgress', { current: order.current_stage })}
                    </span>
                    <StatusBadge status={order.status} />
                    <ArrowRight size={16} className="text-steel-2" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
