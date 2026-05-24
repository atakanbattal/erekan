import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { CustomerContext } from '@/lib/portal/types-ext';
import type { CustomerUserRole } from '@/lib/stages';

async function resolveCustomerContextUncached(userId: string): Promise<CustomerContext | null> {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('id, company_name, contact_name, email')
    .eq('auth_user_id', userId)
    .single();

  if (customer) {
    return {
      customerId: customer.id,
      companyName: customer.company_name,
      contactName: customer.contact_name ?? customer.email,
      email: customer.email,
      userRole: 'owner',
      canManageTeam: true,
      canUpload: true,
    };
  }

  const { data: teamUser } = await supabase
    .from('customer_users')
    .select('customer_id, full_name, email, role, is_active, customers(company_name, contact_name, email)')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .single();

  if (!teamUser?.customers) return null;

  const c = teamUser.customers as unknown as {
    company_name: string;
    contact_name: string | null;
    email: string;
  };

  const role = teamUser.role as CustomerUserRole;

  return {
    customerId: teamUser.customer_id,
    companyName: c.company_name,
    contactName: teamUser.full_name,
    email: teamUser.email,
    userRole: role,
    canManageTeam: role === 'admin',
    canUpload: role === 'admin' || role === 'quality' || role === 'procurement',
  };
}

export const resolveCustomerContext = cache(resolveCustomerContextUncached);

export async function getUnreadNotificationCount(
  audience: 'customer' | 'admin',
  customerId?: string
) {
  const supabase = await createClient();
  let query = supabase
    .from('portal_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('audience', audience)
    .eq('is_read', false);

  if (audience === 'customer' && customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function getUnreadMessageCount(customerId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('portal_messages')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('sender_type', 'admin')
    .eq('is_read_by_customer', false);
  return count ?? 0;
}

export async function getAdminUnreadMessageCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('portal_messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_type', 'customer')
    .eq('is_read_by_admin', false);
  return count ?? 0;
}

export async function getTotalBadgeCount(customerId: string) {
  const [messages, notifications] = await Promise.all([
    getUnreadMessageCount(customerId),
    getUnreadNotificationCount('customer', customerId),
  ]);
  return messages + notifications;
}
