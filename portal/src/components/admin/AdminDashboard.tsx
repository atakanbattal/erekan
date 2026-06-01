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
import { ActionInboxPanel } from '@/components/portal/ActionInboxPanel';
import { AdminKpiGrid, type AdminKpiCardItem } from '@/components/admin/AdminKpiGrid';
import { getServerI18n } from '@/lib/i18n/server';
import type { ActionItem } from '@/lib/portal/actions';
import {
  formatDurationHours,
  type AdminDashboardMetrics,
} from '@/lib/portal/admin-dashboard-metrics';
import { buildOrdersListHref } from '@/lib/portal/order-list-filters';
import type { Order } from '@/lib/types';

interface AdminDashboardProps {
  metrics: AdminDashboardMetrics;
  recentOrders: (Order & { customers?: { company_name: string } | null })[];
  actionItems?: ActionItem[];
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

export async function AdminDashboard({
  metrics,
  recentOrders,
  actionItems = [],
}: AdminDashboardProps) {
  const { t, dateLocale } = await getServerI18n();
  const { orders, customers, messages, rfq, notifications } = metrics;

  const kpiCards: AdminKpiCardItem[] = [
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
      href: buildOrdersListHref({ status: 'active' }),
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
      href: buildOrdersListHref({ filter: 'overdue' }),
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
      {actionItems.length > 0 && (
        <div className="mb-6">
          <ActionInboxPanel items={actionItems} variant="admin" />
        </div>
      )}

      <AdminKpiGrid cards={kpiCards} />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-ink-4 bg-ink-0 shadow-[0_8px_24px_rgba(20,23,28,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-4 bg-gradient-to-r from-blue-500/10 via-ink-0 to-ink-0 px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.25)]">
                <MessageSquare size={18} aria-hidden />
              </span>
              <div>
                <h2 className="font-bold text-bone">{t('admin.dashboard.actionMessagesTitle')}</h2>
                <p className="mt-1 text-sm text-steel-2">{t('admin.dashboard.actionMessagesDesc')}</p>
              </div>
            </div>
            <Link
              href="/admin/messages"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 no-underline transition-colors hover:bg-blue-500/15"
            >
              {t('admin.viewAll')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          {messages.recentAwaiting.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-steel-2">{t('admin.dashboard.noAwaitingMessages')}</p>
          ) : (
            <ul className="divide-y divide-ink-4">
              {messages.recentAwaiting.map((thread) => (
                <li key={thread.threadId}>
                  <Link
                    href="/admin/messages"
                    className={[
                      'flex items-start gap-3 px-5 py-4 no-underline transition-colors hover:bg-ink-2/60',
                      thread.unread ? 'bg-blue-500/[0.04]' : '',
                    ].join(' ')}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-2 text-blue-600">
                      <MessageSquare size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-bone">{thread.subject}</span>
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
                      <p className="mt-1 line-clamp-1 text-xs text-steel-2">{thread.preview}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-steel-2">
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

        <section className="overflow-hidden rounded-2xl border border-ink-4 bg-ink-0 shadow-[0_8px_24px_rgba(20,23,28,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-4 bg-gradient-to-r from-arc-2/12 via-ink-0 to-ink-0 px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arc-2 text-white shadow-[0_6px_16px_rgba(255,122,26,0.28)]">
                <FileQuestion size={18} aria-hidden />
              </span>
              <div>
                <h2 className="font-bold text-bone">{t('admin.dashboard.actionRfqTitle')}</h2>
                <p className="mt-1 text-sm text-steel-2">{t('admin.dashboard.actionRfqDesc')}</p>
              </div>
            </div>
            <Link
              href="/admin/rfq"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-arc-2/25 bg-arc-2/10 px-3 py-1.5 text-xs font-semibold text-arc-2 no-underline transition-colors hover:bg-arc-2/15"
            >
              {t('admin.viewRfq')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          {rfq.recentPending.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-steel-2">{t('admin.dashboard.noPendingRfq')}</p>
          ) : (
            <ul className="divide-y divide-ink-4">
              {rfq.recentPending.map((item) => (
                <li key={item.id}>
                  <Link
                    href="/admin/rfq"
                    className="flex items-start gap-3 px-5 py-4 no-underline transition-colors hover:bg-ink-2/60"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-2 text-arc-2">
                      <FileQuestion size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-bone">{item.title}</span>
                        <ActivityStatusBadge
                          label={t(`adminRfqPage.status.${item.status}`)}
                          variant={item.status === 'reviewing' ? 'awaiting' : 'pending'}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-steel-2">
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

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Link
          href={buildOrdersListHref({ filter: 'overdue' })}
          className="group relative overflow-hidden rounded-2xl border border-danger/20 bg-[linear-gradient(160deg,rgba(220,38,38,0.12)_0%,#ffffff_100%)] p-5 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-danger to-red-500" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger text-white">
              <AlertTriangle size={18} aria-hidden />
            </span>
            <h3 className="font-bold text-bone">{t('admin.overdueOrders')}</h3>
            <span className="ml-auto text-3xl font-black text-danger">{orders.overdue}</span>
          </div>
          <p className="mt-3 text-sm text-steel-2">{t('admin.dashboard.overdueOrdersHint', { dueWeek: orders.dueThisWeek })}</p>
        </Link>
        <Link
          href={buildOrdersListHref({ filter: 'due_this_week' })}
          className="group relative overflow-hidden rounded-2xl border border-amber-400/25 bg-[linear-gradient(160deg,rgba(245,158,11,0.12)_0%,#ffffff_100%)] p-5 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
              <CalendarClock size={18} aria-hidden />
            </span>
            <h3 className="font-bold text-bone">{t('admin.dueThisWeek')}</h3>
            <span className="ml-auto text-3xl font-black text-amber-600">{orders.dueThisWeek}</span>
          </div>
          <p className="mt-3 text-sm text-steel-2">{t('admin.dashboard.dueThisWeekDesc')}</p>
        </Link>
        <Link
          href={buildOrdersListHref({ filter: 'ready_shipment' })}
          className="group relative overflow-hidden rounded-2xl border border-success/25 bg-[linear-gradient(160deg,rgba(22,163,74,0.12)_0%,#ffffff_100%)] p-5 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-success to-emerald-500" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success text-white">
              <Truck size={18} aria-hidden />
            </span>
            <h3 className="font-bold text-bone">{t('admin.dashboard.readyShipment')}</h3>
            <span className="ml-auto text-3xl font-black text-success">{orders.readyShipment}</span>
          </div>
          <p className="mt-3 text-sm text-steel-2">{t('admin.dashboard.readyShipmentDesc')}</p>
        </Link>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-ink-4 bg-ink-0 p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-4 font-bold text-bone">{t('admin.dashboard.orderStatusTitle')}</h3>
          <ul className="flex flex-col gap-2">
            {(
              [
                ['active', orders.active],
                ['on_hold', orders.onHold],
                ['shipped', orders.shipped],
                ['completed', orders.completed],
                ['draft', orders.draft],
              ] as const
            ).map(([status, count]) => (
              <li key={status}>
                <Link
                  href={buildOrdersListHref({ status })}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-4 bg-ink-1 px-3 py-2.5 text-sm text-steel-2 no-underline transition-colors hover:border-ink-5 hover:bg-ink-2"
                >
                  <span>{t(`orderStatus.${status}`)}</span>
                  <strong className="font-black text-bone">{count}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink-4 bg-ink-0 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-ink-4 bg-gradient-to-r from-ink-2/80 to-ink-0 px-5 py-4">
            <div>
              <h2 className="font-bold text-bone">{t('admin.recentOrders')}</h2>
              <p className="mt-1 text-sm text-steel-2">{t('admin.dashboard.recentOrdersDesc')}</p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ink-4 bg-ink-1 px-3 py-1.5 text-xs font-semibold text-arc-2 no-underline hover:bg-ink-2"
            >
              {t('admin.viewAll')}
              <ArrowRight size={14} aria-hidden />
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
