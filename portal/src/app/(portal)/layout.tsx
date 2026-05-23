import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortalShell } from '@/components/portal/PortalShell';
import { getServerI18n } from '@/lib/i18n/server';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-bone mb-2">{t('dashboard.pendingAccount')}</h1>
          <p className="text-steel-2">{t('dashboard.pendingAccountDesc')}</p>
        </div>
      </div>
    );
  }

  const { count } = await supabase
    .from('portal_messages')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .eq('sender_type', 'admin')
    .eq('is_read_by_customer', false);

  return (
    <PortalShell
      userName={customer.contact_name ?? user.email ?? ''}
      companyName={customer.company_name}
      unreadMessages={count ?? 0}
    >
      {children}
    </PortalShell>
  );
}
