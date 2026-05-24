import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FileText, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { DashboardStatCards } from '@/components/portal/DashboardStatCards';
import { OrderStatusChart } from '@/components/portal/OrderStatusChart';
import { OrderTrackingList } from '@/components/portal/OrderTrackingList';
import { DeliveryPerformancePanel } from '@/components/portal/DeliveryPerformancePanel';
import { computeDeliveryMetrics } from '@/lib/portal/delivery-metrics';
import type { OrderStatus } from '@/lib/stages';
import type { Order, OrderDocument, OrderStage, PortalMessage } from '@/lib/types';

export default async function DashboardPage() {
  const { t, dateLocale } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx = await resolveCustomerContext(user!.id);
  if (!ctx) return null;

  const [{ data: orders }, { data: messages }, { data: documents }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', ctx.customerId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('portal_messages')
      .select('thread_id, subject, body, created_at')
      .eq('customer_id', ctx.customerId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('order_documents')
      .select('id, name, created_at, orders!inner(customer_id, job_number)')
      .eq('orders.customer_id', ctx.customerId)
      .eq('is_visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const orderList = (orders ?? []) as Order[];
  const trackedOrderIds = orderList.slice(0, 10).map((o) => o.id);

  let allStages: OrderStage[] = [];
  if (trackedOrderIds.length > 0) {
    const { data } = await supabase
      .from('order_stages')
      .select('id, order_id, stage_number, stage_code, title, status, completed_at')
      .in('order_id', trackedOrderIds)
      .order('stage_number');
    allStages = (data ?? []) as OrderStage[];
  }

  const stagesByOrderId = allStages.reduce<Record<string, OrderStage[]>>((acc, stage) => {
    if (!acc[stage.order_id]) acc[stage.order_id] = [];
    acc[stage.order_id].push(stage);
    return acc;
  }, {});

  const activeCount = orderList.filter((o) => o.status === 'active').length;
  const shippedCount = orderList.filter((o) => o.status === 'shipped').length;
  const completedCount = orderList.filter((o) => o.status === 'completed').length;
  const readyCount = orderList.filter(
    (o) => o.status === 'active' && o.current_stage >= 6
  ).length;

  const statusCounts = orderList.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const docList = documents ?? [];
  let docCount = docList.length;
  if (orderList.length > 0) {
    const { count } = await supabase
      .from('order_documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_visible_to_customer', true)
      .in('order_id', orderList.map((o) => o.id));
    docCount = count ?? docList.length;
  }

  const deliveryMetrics = computeDeliveryMetrics(orderList, docCount);

  const recentMessages = (messages ?? []) as PortalMessage[];
  const threadPreviews = recentMessages.reduce((acc, msg) => {
    if (!acc.has(msg.thread_id)) acc.set(msg.thread_id, msg);
    return acc;
  }, new Map<string, PortalMessage>());

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('dashboard.welcome', { name: ctx.contactName })}</h1>
        <p className="portal-page-subtitle">{t('dashboard.welcomeSubtitle')}</p>
      </div>

      <DashboardStatCards
        total={orderList.length}
        inProduction={activeCount}
        readyShipment={readyCount}
        completed={completedCount + shippedCount}
      />

      <div className="portal-widget mb-5">
        <div className="portal-widget-header">
          <div>
            <h2 className="portal-widget-title">{t('dashboard.deliveryPerformance')}</h2>
            <p className="portal-widget-desc">{t('dashboard.deliveryPerformanceDesc')}</p>
          </div>
        </div>
        <DeliveryPerformancePanel metrics={deliveryMetrics} />
      </div>

      <div className="portal-widget portal-widget--stacked mb-5">
        <div className="portal-widget-header">
          <div>
            <h2 className="portal-widget-title">{t('dashboard.ordersOverview')}</h2>
            <p className="portal-widget-desc">{t('dashboard.orderTrackingDesc')}</p>
          </div>
          <Link href="/orders" className="text-sm text-arc-2 hover:underline shrink-0">
            {t('dashboard.viewAll')} →
          </Link>
        </div>

        {orderList.length === 0 ? (
          <div className="portal-empty-state">{t('dashboard.noActiveOrder')}</div>
        ) : (
          <>
            <OrderTrackingList
              orders={orderList.slice(0, 10)}
              stagesByOrderId={stagesByOrderId}
            />

            <div className="order-overview-status">
              <h3 className="order-overview-status-title">{t('dashboard.statusDistribution')}</h3>
              <OrderStatusChart counts={statusCounts as Record<OrderStatus, number>} />
            </div>
          </>
        )}
      </div>

      <div className="portal-dashboard-grid portal-dashboard-grid--2">
        <div className="portal-widget">
          <div className="portal-widget-header">
            <h2 className="portal-widget-title">{t('dashboard.recentMessages')}</h2>
            <Link href="/messages" className="text-sm text-arc-2 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {threadPreviews.size === 0 ? (
            <div className="portal-empty-state">{t('messages.noMessages')}</div>
          ) : (
            <ul className="portal-mini-list">
              {Array.from(threadPreviews.values())
                .slice(0, 3)
                .map((msg) => (
                  <li key={msg.thread_id}>
                    <Link href="/messages" className="portal-mini-list-item">
                      <MessageSquare size={16} className="text-arc-2 shrink-0 mt-0.5" />
                      <div className="portal-mini-list-content">
                        <div className="font-medium text-bone truncate">{msg.subject}</div>
                        <div className="text-xs text-steel-2 truncate">{msg.body}</div>
                      </div>
                      <span className="portal-mini-list-meta">
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="portal-widget">
          <div className="portal-widget-header">
            <h2 className="portal-widget-title">{t('dashboard.recentDocuments')}</h2>
            <Link href="/documents" className="text-sm text-arc-2 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {!docList.length ? (
            <div className="portal-empty-state">{t('documentsPage.noDocuments')}</div>
          ) : (
            <ul className="portal-mini-list">
              {(docList as { id: string; name: string; orders: { job_number: string } | { job_number: string }[] }[]).map(
                (doc) => {
                  const jobNumber = Array.isArray(doc.orders)
                    ? doc.orders[0]?.job_number
                    : doc.orders?.job_number;
                  return (
                  <li key={doc.id}>
                    <Link href="/documents" className="portal-mini-list-item">
                      <FileText size={16} className="text-success shrink-0 mt-0.5" />
                      <div className="portal-mini-list-content">
                        <div className="font-medium text-bone truncate">{doc.name}</div>
                        <div className="text-xs text-steel-2 truncate">{jobNumber}</div>
                      </div>
                    </Link>
                  </li>
                  );
                }
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
