import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Customer } from '@/lib/types';

export interface CustomerContext {
  userId: string;
  userEmail: string;
  customer: Customer;
  unreadMessages: number;
}

export async function getCustomerContext(): Promise<CustomerContext> {
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
    throw new Error('NO_CUSTOMER');
  }

  const { count } = await supabase
    .from('portal_messages')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .eq('sender_type', 'admin')
    .eq('is_read_by_customer', false);

  return {
    userId: user.id,
    userEmail: user.email ?? '',
    customer: customer as Customer,
    unreadMessages: count ?? 0,
  };
}
