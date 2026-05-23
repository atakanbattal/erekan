import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortalShell } from '@/components/portal/PortalShell';
import { getServerI18n } from '@/lib/i18n/server';

export default async function AdminLayout({
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
    .select('is_admin, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) redirect('/dashboard');

  const { count } = await supabase
    .from('portal_messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_type', 'customer')
    .eq('is_read_by_admin', false);

  return (
    <PortalShell
      variant="admin"
      userName={staff.full_name}
      companyName={t('nav.adminCompany')}
      unreadMessages={count ?? 0}
    >
      {children}
    </PortalShell>
  );
}
