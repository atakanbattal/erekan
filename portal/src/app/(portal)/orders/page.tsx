import { createClient } from '@/lib/supabase/server';
import { OrdersPageClient } from './OrdersPageClient';
import type { Order } from '@/lib/types';

export default async function OrdersPage() {
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

  return <OrdersPageClient orders={(orders ?? []) as Order[]} />;
}
