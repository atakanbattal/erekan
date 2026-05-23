import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { OrderCard } from '@/components/OrderCard';
import type { Order } from '@/lib/types';

export default async function OrdersPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', user!.id)
    .single();

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customer!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('dashboard.ordersPageTitle')}</h1>
        <p className="portal-page-subtitle">{t('dashboard.ordersPageSubtitle')}</p>
      </div>

      {!orders?.length ? (
        <div className="card p-12 text-center">
          <p className="text-steel-2">{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(orders as Order[]).map((order) => (
            <OrderCard key={order.id} order={order} href={`/orders/${order.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
