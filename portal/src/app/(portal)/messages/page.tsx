import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { MessagesPageClient } from './MessagesPageClient';
import type { Order, PortalMessage } from '@/lib/types';

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const [{ data: messages }, { data: orders }] = await Promise.all([
    supabase
      .from('portal_messages')
      .select('*, attachments:portal_message_attachments(*)')
      .eq('customer_id', ctx.customerId)
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id, job_number, title')
      .eq('customer_id', ctx.customerId)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <MessagesPageClient
      customerId={ctx.customerId}
      senderName={ctx.contactName}
      messages={(messages ?? []) as PortalMessage[]}
      orders={(orders ?? []) as Pick<Order, 'id' | 'job_number' | 'title'>[]}
    />
  );
}
