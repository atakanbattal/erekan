import { createAdminClient } from '@/lib/supabase/admin';
import { isOrderOverdue } from '@/lib/portal/order-list-filters';
import { buildOrdersListHref } from '@/lib/portal/order-list-filters';
import type { AdminDashboardMetrics } from '@/lib/portal/admin-dashboard-metrics';
import type { Order } from '@/lib/types';
import type { RfqRequest } from '@/lib/portal/types-ext';
import type { NotificationType } from '@/lib/stages';

interface SyncInput {
  orders: Order[];
  rfqs: RfqRequest[];
  messageMetrics: AdminDashboardMetrics['messages'];
  rfqMetrics: AdminDashboardMetrics['rfq'];
}

async function ensureAdminNotification(params: {
  type: NotificationType;
  title: string;
  body?: string;
  link: string;
  orderId?: string | null;
  customerId?: string | null;
}) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('portal_notifications')
    .select('id')
    .eq('audience', 'admin')
    .eq('is_read', false)
    .eq('type', params.type)
    .eq('link', params.link)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  await admin.from('portal_notifications').insert({
    audience: 'admin',
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link,
    order_id: params.orderId ?? null,
    customer_id: params.customerId ?? null,
  });
}

/** Create unread admin notifications from current operational data (deduped by type+link). */
export async function syncAdminOperationalNotifications(input: SyncInput) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const { orders, rfqs, messageMetrics, rfqMetrics } = input;

  const overdueWithoutNote = orders.filter(
    (o) => isOrderOverdue(o) && !o.delay_reason?.trim()
  );

  if (overdueWithoutNote.length > 0) {
    await ensureAdminNotification({
      type: 'delivery_overdue',
      title: `${overdueWithoutNote.length} geciken sipariş`,
      body: 'Gecikme açıklaması girilmesi gereken aktif siparişler var.',
      link: buildOrdersListHref({ filter: 'overdue' }),
    });

    for (const order of overdueWithoutNote.slice(0, 5)) {
      await ensureAdminNotification({
        type: 'action_required',
        title: `Gecikme notu: ${order.job_number}`,
        body: order.title,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        customerId: order.customer_id,
      });
    }
  }

  if (rfqMetrics.pendingCount > 0) {
    await ensureAdminNotification({
      type: 'rfq_submitted',
      title: `${rfqMetrics.pendingCount} bekleyen teklif talebi`,
      body: 'İncelenmeyi veya teklif hazırlamayı bekleyen RFQ kayıtları var.',
      link: '/admin/rfq',
    });
  }

  for (const rfq of rfqs.filter((r) => r.status === 'approved' && !r.converted_order_id).slice(0, 5)) {
    await ensureAdminNotification({
      type: 'action_required',
      title: `Siparişe dönüştür: ${rfq.title}`,
      body: 'Onaylanan teklif siparişe dönüştürülebilir.',
      link: '/admin/rfq',
      customerId: rfq.customer_id,
    });
  }

  if (messageMetrics.awaitingReplyCount > 0) {
    await ensureAdminNotification({
      type: 'message_reply',
      title: `${messageMetrics.awaitingReplyCount} mesaj yanıt bekliyor`,
      body:
        messageMetrics.unreadCount > 0
          ? `${messageMetrics.unreadCount} okunmamış müşteri mesajı var.`
          : 'Müşteriden gelen konuşmalar yanıt bekliyor.',
      link: '/admin/messages',
    });
  }

  if (messageMetrics.supportPending > 0) {
    await ensureAdminNotification({
      type: 'support_request',
      title: `${messageMetrics.supportPending} açık destek talebi`,
      body: 'Destek kategorisinde yanıt bekleyen kayıtlar var.',
      link: '/admin/messages',
    });
  }

  for (const thread of messageMetrics.recentAwaiting.filter((t) => t.unread).slice(0, 3)) {
    await ensureAdminNotification({
      type: 'message_reply',
      title: `Okunmamış: ${thread.subject}`,
      body: `${thread.companyName} · ${thread.preview.slice(0, 120)}`,
      link: '/admin/messages',
    });
  }
}
