import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Package,
  Users,
  Plus,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  CalendarClock,
  FileWarning,
  Bell,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { getServerI18n } from '@/lib/i18n/server';
import type { Order } from '@/lib/types';

export default async function AdminPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) redirect('/dashboard');

  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const [
    { count: orderCount },
    { count: customerCount },
    { data: allOrders },
    { count: unreadMessages },
    { count: unreadNotifications },
    { count: pendingRfq },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*, customers(company_name)').order('updated_at', { ascending: false }),
    supabase
      .from('portal_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'customer')
      .eq('is_read_by_admin', false),
    supabase
      .from('portal_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('audience', 'admin')
      .eq('is_read', false),
    supabase
      .from('rfq_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'reviewing']),
  ]);

  const orders = (allOrders ?? []) as (Order & { customers: { company_name: string } })[];
  const activeOrders = orders.filter((o) => o.status === 'active');
  const overdueOrders = orders.filter(
    (o) =>
      o.expected_delivery &&
      new Date(o.expected_delivery) < today &&
      (o.status === 'active' || o.status === 'on_hold')
  );
  const dueThisWeek = orders.filter(
    (o) =>
      o.expected_delivery &&
      new Date(o.expected_delivery) >= today &&
      new Date(o.expected_delivery) <= weekLater &&
      (o.status === 'active' || o.status === 'on_hold')
  );
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="portal-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
          <h1 className="text-3xl font-black text-bone">{t('admin.panelTitle')}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/orders/new" className="btn-primary flex items-center gap-2">
            <Plus size={18} /> {t('admin.newOrder')}
          </Link>
          <Link href="/admin/customers/new" className="btn-secondary flex items-center gap-2">
            <Plus size={18} /> {t('admin.newCustomer')}
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Package size={20} className="text-arc-2" />
            <span className="label">{t('admin.totalOrders')}</span>
          </div>
          <div className="text-3xl font-black text-bone">{orderCount ?? 0}</div>
          <div className="text-xs text-steel-2 mt-1">
            {t('admin.activeProduction', { count: activeOrders.length })}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-arc-2" />
            <span className="label">{t('admin.customerCount')}</span>
          </div>
          <div className="text-3xl font-black text-bone">{customerCount ?? 0}</div>
        </div>
        <Link href="/admin/messages" className="card p-5 hover:border-arc-2/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare size={20} className="text-arc-2" />
            <span className="label">{t('messages.adminInbox')}</span>
            {(unreadMessages ?? 0) > 0 && (
              <span className="portal-sidebar-badge ml-auto">{unreadMessages}</span>
            )}
          </div>
          <div className="text-lg font-bold text-bone">{t('nav.messages')}</div>
        </Link>
        <Link href="/admin/notifications" className="card p-5 hover:border-arc-2/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Bell size={20} className="text-arc-2" />
            <span className="label">{t('notifications.title')}</span>
            {(unreadNotifications ?? 0) > 0 && (
              <span className="portal-sidebar-badge ml-auto">{unreadNotifications}</span>
            )}
          </div>
          <div className="text-lg font-bold text-bone">{t('admin.opsAlerts')}</div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 border-l-4 border-l-danger">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-danger" />
            <h3 className="font-bold text-bone">{t('admin.overdueOrders')}</h3>
            <span className="ml-auto text-2xl font-black text-danger">{overdueOrders.length}</span>
          </div>
          {overdueOrders.length === 0 ? (
            <p className="text-sm text-steel-2">{t('admin.noOverdue')}</p>
          ) : (
            <ul className="space-y-2">
              {overdueOrders.slice(0, 4).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="text-sm text-arc-2 hover:underline">
                    {o.job_number} — {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={18} className="text-amber-400" />
            <h3 className="font-bold text-bone">{t('admin.dueThisWeek')}</h3>
            <span className="ml-auto text-2xl font-black text-amber-400">{dueThisWeek.length}</span>
          </div>
          {dueThisWeek.length === 0 ? (
            <p className="text-sm text-steel-2">{t('admin.noDueWeek')}</p>
          ) : (
            <ul className="space-y-2">
              {dueThisWeek.slice(0, 4).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="text-sm text-arc-2 hover:underline">
                    {o.job_number} — {o.customers?.company_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5 border-l-4 border-l-arc-2">
          <div className="flex items-center gap-2 mb-3">
            <FileWarning size={18} className="text-arc-2" />
            <h3 className="font-bold text-bone">{t('rfq.adminTitle')}</h3>
            <span className="ml-auto text-2xl font-black text-arc-2">{pendingRfq ?? 0}</span>
          </div>
          <Link href="/admin/rfq" className="text-sm text-arc-2 hover:underline">
            {t('admin.viewRfq')} →
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="p-5 border-b border-ink-4 flex items-center justify-between">
          <h2 className="font-bold text-bone">{t('admin.recentOrders')}</h2>
          <Link href="/admin/orders" className="text-sm text-arc-2 hover:underline">
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
                <div>
                  <div className="font-mono text-sm text-arc-2">{order.job_number}</div>
                  <div className="font-medium text-bone">{order.title}</div>
                  <div className="text-xs text-steel-2">{order.customers?.company_name}</div>
                </div>
                <div className="flex items-center gap-3">
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
  );
}
