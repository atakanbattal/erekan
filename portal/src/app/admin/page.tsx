import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getServerI18n } from '@/lib/i18n/server';
import {
  computeMessageMetrics,
  computeOrderMetrics,
  computeRfqMetrics,
  type AdminDashboardMetrics,
} from '@/lib/portal/admin-dashboard-metrics';
import type { Order, PortalMessage } from '@/lib/types';
import type { RfqRequest } from '@/lib/portal/types-ext';

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

  const lookback = new Date();
  lookback.setDate(lookback.getDate() - 120);

  const [
    { data: allOrders },
    { count: customerCount },
    { count: activeCustomerCount },
    { data: messages },
    { count: unreadNotifications },
    { data: rfqs },
  ] = await Promise.all([
    supabase.from('orders').select('*, customers(company_name)').order('job_number', { ascending: false }),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('portal_messages')
      .select('*, customers(company_name, contact_name, email)')
      .gte('created_at', lookback.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('portal_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('audience', 'admin')
      .eq('is_read', false),
    supabase
      .from('rfq_requests')
      .select('*, customers(company_name, contact_name, email)')
      .order('created_at', { ascending: false }),
  ]);

  const orders = (allOrders ?? []) as (Order & { customers: { company_name: string } })[];
  const orderMetrics = computeOrderMetrics(orders);
  const messageMetrics = computeMessageMetrics((messages ?? []) as PortalMessage[]);
  const rfqMetrics = computeRfqMetrics((rfqs ?? []) as RfqRequest[]);

  const metrics: AdminDashboardMetrics = {
    orders: orderMetrics,
    customers: {
      total: customerCount ?? 0,
      active: activeCustomerCount ?? 0,
    },
    messages: messageMetrics,
    rfq: rfqMetrics,
    notifications: {
      unreadCount: unreadNotifications ?? 0,
    },
  };

  return (
    <div className="portal-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
          <h1 className="text-3xl font-black text-bone">{t('admin.panelTitle')}</h1>
          <p className="text-sm text-steel-2 mt-2">{t('admin.dashboard.subtitle')}</p>
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

      <AdminDashboard metrics={metrics} recentOrders={orders.slice(0, 6)} />
    </div>
  );
}
