import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { getServerI18n } from '@/lib/i18n/server';
import type { Order } from '@/lib/types';

export default async function AdminOrdersPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) redirect('/dashboard');

  const { data: orders } = await supabase
    .from('orders')
    .select('*, customers(company_name, contact_name)')
    .order('job_number', { ascending: false });

  return (
    <div className="portal-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="eyebrow mb-2">{t('common.admin')}</div>
            <h1 className="text-2xl font-black text-bone">{t('admin.ordersTitle')}</h1>
          </div>
          <Link href="/admin/orders/new" className="btn-primary flex items-center gap-2">
            <Plus size={18} /> {t('admin.newOrder')}
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
              <thead>
                <tr className="border-b border-ink-4 bg-ink-3">
                  <th className="text-left p-4 table-head">{t('admin.jobNumber')}</th>
                  <th className="text-left p-4 table-head">{t('admin.title')}</th>
                  <th className="text-left p-4 table-head">{t('admin.customer')}</th>
                  <th className="text-left p-4 table-head">{t('common.stage')}</th>
                  <th className="text-left p-4 table-head">{t('common.status')}</th>
                  <th className="text-left p-4 table-head"></th>
                </tr>
              </thead>
              <tbody>
                {!orders?.length ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-steel-2">
                      {t('admin.noOrders')}
                    </td>
                  </tr>
                ) : (
                  (orders as (Order & { customers: { company_name: string } })[]).map(
                    (order) => (
                      <tr
                        key={order.id}
                        className="border-b border-ink-4 hover:bg-ink-3/30 transition-colors"
                      >
                        <td className="p-4 font-mono text-arc-2">{order.job_number}</td>
                        <td className="p-4 text-bone font-medium">{order.title}</td>
                        <td className="p-4 text-steel-3">{order.customers?.company_name}</td>
                        <td className="p-4 text-steel-2">{order.current_stage}/7</td>
                        <td className="p-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-arc-2 hover:underline text-sm"
                          >
                            {t('admin.manage')}
                          </Link>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
