import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortalShell } from '@/components/portal/PortalShell';
import { getServerI18n } from '@/lib/i18n/server';
import { getAdminUnreadMessageCount, getUnreadNotificationCount } from '@/lib/portal/customer-context';

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

  const [unreadMessages, unreadNotifications] = await Promise.all([
    getAdminUnreadMessageCount(),
    getUnreadNotificationCount('admin'),
  ]);

  return (
    <PortalShell
      variant="admin"
      userName={staff.full_name}
      companyName={t('nav.adminCompany')}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </PortalShell>
  );
}
