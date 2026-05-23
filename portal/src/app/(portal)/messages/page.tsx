import { createClient } from '@/lib/supabase/server';
import { MessagesPageClient } from './MessagesPageClient';
import type { Order, PortalMessage } from '@/lib/types';

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single();

  const [{ data: messages }, { data: orders }] = await Promise.all([
    supabase
      .from('portal_messages')
      .select('*')
      .eq('customer_id', customer!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, job_number, title')
      .eq('customer_id', customer!.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <MessagesPageClient
      customerId={customer!.id}
      senderName={customer!.contact_name ?? user!.email ?? ''}
      messages={(messages ?? []) as PortalMessage[]}
      orders={(orders ?? []) as Pick<Order, 'id' | 'job_number' | 'title'>[]}
    />
  );
}
