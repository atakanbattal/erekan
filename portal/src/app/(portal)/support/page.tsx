import { createClient } from '@/lib/supabase/server';
import { SupportPageClient } from './SupportPageClient';
import type { Order } from '@/lib/types';

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, job_number, title')
    .eq('customer_id', customer!.id)
    .order('created_at', { ascending: false });

  return (
    <SupportPageClient
      customerId={customer!.id}
      senderName={customer!.contact_name ?? user!.email ?? ''}
      orders={(orders ?? []) as Pick<Order, 'id' | 'job_number' | 'title'>[]}
    />
  );
}
