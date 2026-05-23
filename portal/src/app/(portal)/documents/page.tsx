import { createClient } from '@/lib/supabase/server';
import { DocumentsPageClient } from './DocumentsPageClient';
import type { OrderDocument } from '@/lib/types';

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', user!.id)
    .single();

  const [{ data: documents }, { data: orders }] = await Promise.all([
    supabase
      .from('order_documents')
      .select('*, orders!inner(id, customer_id, job_number, title)')
      .eq('orders.customer_id', customer!.id)
      .eq('is_visible_to_customer', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, job_number, title')
      .eq('customer_id', customer!.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <DocumentsPageClient
      documents={
        (documents ?? []) as (OrderDocument & {
          orders: { job_number: string; title: string };
        })[]
      }
      orderOptions={orders ?? []}
    />
  );
}
