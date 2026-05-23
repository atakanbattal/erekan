import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { OrderCard } from '@/components/OrderCard';
import { getServerI18n } from '@/lib/i18n/server';
import type { Order } from '@/lib/types';

export default async function DashboardPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single();

  if (staff?.is_admin) redirect('/admin');

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!customer) {
    return (
      <>
        <Header userName={user.email ?? ''} />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-bold text-bone mb-2">{t('dashboard.pendingAccount')}</h1>
            <p className="text-steel-2">{t('dashboard.pendingAccountDesc')}</p>
          </div>
        </main>
      </>
    );
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  const activeCount = orders?.filter((o) => o.status === 'active').length ?? 0;
  const shippedCount = orders?.filter((o) => o.status === 'shipped').length ?? 0;

  return (
    <>
      <Header
        userName={customer.contact_name ?? user.email ?? ''}
        companyName={customer.company_name}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="eyebrow mb-2">{t('common.portal')}</div>
          <h1 className="text-3xl font-black text-bone mb-2">{t('dashboard.title')}</h1>
          <p className="text-steel-2">{t('dashboard.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <div className="label">{t('dashboard.totalOrders')}</div>
            <div className="text-2xl font-black text-bone">{orders?.length ?? 0}</div>
          </div>
          <div className="card p-4">
            <div className="label">{t('dashboard.inProduction')}</div>
            <div className="text-2xl font-black text-arc-2">{activeCount}</div>
          </div>
          <div className="card p-4">
            <div className="label">{t('dashboard.shipped')}</div>
            <div className="text-2xl font-black text-success">{shippedCount}</div>
          </div>
          <div className="card p-4">
            <div className="label">{t('common.company')}</div>
            <div className="text-sm font-bold text-bone truncate">{customer.company_name}</div>
          </div>
        </div>

        {!orders?.length ? (
          <div className="card p-12 text-center">
            <p className="text-steel-2">{t('dashboard.noOrders')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(orders as Order[]).map((order) => (
              <OrderCard key={order.id} order={order} href={`/orders/${order.id}`} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
