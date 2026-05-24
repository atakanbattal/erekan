import type { RfqRequest } from '@/lib/portal/types-ext';
import type { Order, PortalMessage } from '@/lib/types';
import type { RfqStatus } from '@/lib/stages';

export interface AdminMessagePreview {
  threadId: string;
  subject: string;
  companyName: string;
  category: string;
  preview: string;
  createdAt: string;
  unread: boolean;
}

export interface AdminRfqPreview {
  id: string;
  title: string;
  companyName: string;
  status: RfqStatus;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  orders: {
    total: number;
    active: number;
    onHold: number;
    shipped: number;
    completed: number;
    draft: number;
    cancelled: number;
    overdue: number;
    dueThisWeek: number;
    readyShipment: number;
    avgStageProgress: number;
  };
  customers: {
    total: number;
    active: number;
  };
  messages: {
    unreadCount: number;
    awaitingReplyCount: number;
    supportPending: number;
    avgResponseHours: number | null;
    sampleSize: number;
    recentAwaiting: AdminMessagePreview[];
  };
  rfq: {
    pendingCount: number;
    quotedCount: number;
    openCount: number;
    avgQuoteResponseHours: number | null;
    quoteSampleSize: number;
    recentPending: AdminRfqPreview[];
  };
  notifications: {
    unreadCount: number;
  };
}

function hoursBetween(start: string, end: string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeMessageMetrics(
  messages: PortalMessage[],
  limit = 5
): AdminDashboardMetrics['messages'] {
  const byThread = messages.reduce<Map<string, PortalMessage[]>>((acc, message) => {
    if (!acc.has(message.thread_id)) acc.set(message.thread_id, []);
    acc.get(message.thread_id)!.push(message);
    return acc;
  }, new Map());

  const responseHours: number[] = [];
  const awaitingThreads: AdminMessagePreview[] = [];
  let unreadCount = 0;
  let supportPending = 0;

  for (const [, threadMessages] of byThread) {
    const sorted = [...threadMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const latest = sorted[sorted.length - 1];
    const companyName =
      latest.customers?.company_name ??
      threadMessages.find((m) => m.customers?.company_name)?.customers?.company_name ??
      '—';

    for (const message of sorted) {
      if (message.sender_type === 'customer' && !message.is_read_by_admin) {
        unreadCount += 1;
      }

      if (message.sender_type !== 'customer') continue;

      const nextAdmin = sorted.find(
        (candidate) =>
          candidate.sender_type === 'admin' &&
          new Date(candidate.created_at).getTime() > new Date(message.created_at).getTime()
      );

      if (nextAdmin) {
        responseHours.push(hoursBetween(message.created_at, nextAdmin.created_at));
      }
    }

    if (latest.sender_type === 'customer') {
      const threadUnread = sorted.some(
        (m) => m.sender_type === 'customer' && !m.is_read_by_admin
      );
      if (latest.category === 'support') supportPending += 1;

      awaitingThreads.push({
        threadId: latest.thread_id,
        subject: latest.subject,
        companyName,
        category: latest.category,
        preview: latest.body.slice(0, 120),
        createdAt: latest.created_at,
        unread: threadUnread,
      });
    }
  }

  awaitingThreads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    unreadCount,
    awaitingReplyCount: awaitingThreads.length,
    supportPending,
    avgResponseHours: average(responseHours),
    sampleSize: responseHours.length,
    recentAwaiting: awaitingThreads.slice(0, limit),
  };
}

export function computeRfqMetrics(rfqs: RfqRequest[], limit = 5): AdminDashboardMetrics['rfq'] {
  const pendingStatuses: RfqStatus[] = ['submitted', 'reviewing'];
  const openStatuses: RfqStatus[] = ['submitted', 'reviewing', 'quoted'];

  const pending = rfqs.filter((rfq) => pendingStatuses.includes(rfq.status));
  const quoted = rfqs.filter((rfq) => rfq.status === 'quoted');
  const open = rfqs.filter((rfq) => openStatuses.includes(rfq.status));

  const quoteResponseHours = rfqs
    .filter(
      (rfq) =>
        rfq.quote_file_path &&
        ['quoted', 'approved', 'converted'].includes(rfq.status)
    )
    .map((rfq) => hoursBetween(rfq.created_at, rfq.updated_at));

  const recentPending = pending
    .map((rfq) => ({
      id: rfq.id,
      title: rfq.title,
      companyName: rfq.customers?.company_name ?? '—',
      status: rfq.status,
      createdAt: rfq.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return {
    pendingCount: pending.length,
    quotedCount: quoted.length,
    openCount: open.length,
    avgQuoteResponseHours: average(quoteResponseHours),
    quoteSampleSize: quoteResponseHours.length,
    recentPending,
  };
}

export function computeOrderMetrics(
  orders: Order[],
  today = new Date()
): AdminDashboardMetrics['orders'] {
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const active = orders.filter((o) => o.status === 'active');
  const avgStageProgress = active.length
    ? Math.round(active.reduce((sum, o) => sum + (o.current_stage / 7) * 100, 0) / active.length)
    : 0;

  return {
    total: orders.length,
    active: active.length,
    onHold: orders.filter((o) => o.status === 'on_hold').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    draft: orders.filter((o) => o.status === 'draft').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    overdue: orders.filter(
      (o) =>
        o.expected_delivery &&
        new Date(o.expected_delivery) < today &&
        (o.status === 'active' || o.status === 'on_hold')
    ).length,
    dueThisWeek: orders.filter(
      (o) =>
        o.expected_delivery &&
        new Date(o.expected_delivery) >= today &&
        new Date(o.expected_delivery) <= weekLater &&
        (o.status === 'active' || o.status === 'on_hold')
    ).length,
    readyShipment: active.filter((o) => o.current_stage >= 6).length,
    avgStageProgress,
  };
}

export function formatDurationHours(hours: number | null) {
  if (hours == null || Number.isNaN(hours)) return null;
  if (hours < 1) return { value: Math.round(hours * 60), unit: 'minutes' as const };
  if (hours < 48) return { value: Math.round(hours * 10) / 10, unit: 'hours' as const };
  return { value: Math.round((hours / 24) * 10) / 10, unit: 'days' as const };
}
