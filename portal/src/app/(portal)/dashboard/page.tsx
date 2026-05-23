import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Hash, FileText, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { DashboardStatCards } from '@/components/portal/DashboardStatCards';
import { OrderStatusChart } from '@/components/portal/OrderStatusChart';
import { ProcessFlow } from '@/components/ProcessFlow';
import { StatusBadge } from '@/components/StatusBadge';
import type { Order, OrderDocument, OrderStage, PortalMessage } from '@/lib/types';
import type { OrderStatus } from '@/lib/stages';

export default async function DashboardPage() {
  const { t, dateLocale } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single();

  const [{ data: orders }, { data: messages }, { data: documents }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customer!.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('portal_messages')
      .select('*')
      .eq('customer_id', customer!.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('order_documents')
      .select('*, orders!inner(customer_id, job_number)')
      .eq('orders.customer_id', customer!.id)
      .eq('is_visible_to_customer', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const orderList = (orders ?? []) as Order[];
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
    {} as Record<OrderStatus, number>
  );

  const featuredOrder = orderList.find((o) => o.status === 'active') ?? orderList[0];

  let featuredStages: OrderStage[] = [];
  if (featuredOrder) {
    const { data } = await supabase
      .from('order_stages')
      .select('*')
      .eq('order_id', featuredOrder.id)
      .order('stage_number');
    featuredStages = (data ?? []) as OrderStage[];
  }

  const recentMessages = (messages ?? []) as PortalMessage[];
  const threadPreviews = recentMessages.reduce((acc, msg) => {
    if (!acc.has(msg.thread_id)) acc.set(msg.thread_id, msg);
    return acc;
  }, new Map<string, PortalMessage>());

  const displayName = customer?.contact_name ?? user?.email ?? '';

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('dashboard.welcome', { name: displayName })}</h1>
        <p className="portal-page-subtitle">{t('dashboard.welcomeSubtitle')}</p>
      </div>

      <DashboardStatCards
        total={orderList.length}
        inProduction={activeCount}
        readyShipment={readyCount}
        completed={completedCount + shippedCount}
      />

      <div className="portal-dashboard-grid">
        <div className="portal-widget portal-widget--wide">
          <div className="portal-widget-header">
            <div>
              <h2 className="portal-widget-title">{t('dashboard.orderTracking')}</h2>
              <p className="portal-widget-desc">{t('dashboard.orderTrackingDesc')}</p>
            </div>
            {featuredOrder && (
              <Link href={`/orders/${featuredOrder.id}`} className="text-sm text-arc-2 hover:underline">
                {t('processFlow.viewDetails')} →
              </Link>
            )}
          </div>

          {featuredOrder ? (
            <div className="portal-tracking-widget">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-arc-2" />
                  <span className="font-mono text-arc-2">{featuredOrder.job_number}</span>
                </div>
                <h3 className="font-bold text-bone">{featuredOrder.title}</h3>
                <StatusBadge status={featuredOrder.status} />
              </div>
              <ProcessFlow
                stages={featuredStages}
                currentStage={featuredOrder.current_stage}
                expectedDelivery={featuredOrder.expected_delivery}
                orderHref={`/orders/${featuredOrder.id}`}
              />
            </div>
          ) : (
            <div className="portal-empty-state">{t('dashboard.noActiveOrder')}</div>
          )}
        </div>

        <div className="portal-widget">
          <h2 className="portal-widget-title mb-4">{t('dashboard.statusDistribution')}</h2>
          <OrderStatusChart counts={statusCounts} />
        </div>
      </div>

      <div className="portal-dashboard-grid portal-dashboard-grid--3">
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
                      <MessageSquare size={16} className="text-arc-2 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-bone truncate">{msg.subject}</div>
                        <div className="text-xs text-steel-2 truncate">{msg.body}</div>
                      </div>
                      <span className="text-xs text-steel-2 shrink-0">
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
          {!documents?.length ? (
            <div className="portal-empty-state">{t('documentsPage.noDocuments')}</div>
          ) : (
            <ul className="portal-mini-list">
              {(documents as (OrderDocument & { orders: { job_number: string } })[]).map((doc) => (
                <li key={doc.id}>
                  <Link href="/documents" className="portal-mini-list-item">
                    <FileText size={16} className="text-success shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-bone truncate">{doc.name}</div>
                      <div className="text-xs text-steel-2">{doc.orders?.job_number}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="portal-widget">
          <div className="portal-widget-header">
            <h2 className="portal-widget-title">{t('dashboard.productionProgress')}</h2>
            <Link href="/orders" className="text-sm text-arc-2 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {!orderList.length ? (
            <div className="portal-empty-state">{t('dashboard.noOrders')}</div>
          ) : (
            <ul className="portal-progress-list">
              {orderList.slice(0, 4).map((order) => (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`} className="portal-progress-item">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-mono text-arc-2">{order.job_number}</span>
                      <span className="text-steel-2">
                        {t('order.stageProgress', { current: order.current_stage })}
                      </span>
                    </div>
                    <div className="portal-progress-bar">
                      <div
                        className="portal-progress-fill"
                        style={{ width: `${(order.current_stage / 7) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
