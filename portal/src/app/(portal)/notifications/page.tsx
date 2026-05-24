import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { NotificationPanel } from '@/components/portal/NotificationPanel';
import type { PortalNotification } from '@/lib/portal/types-ext';

export default async function NotificationsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: notifications } = await supabase
    .from('portal_notifications')
    .select('*')
    .eq('audience', 'customer')
    .eq('customer_id', ctx.customerId)
    .order('created_at', { ascending: false });

  return (
    <div className="portal-page max-w-2xl">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('notificationsPage.title')}</h1>
        <p className="portal-page-subtitle">{t('notificationsPage.subtitle')}</p>
      </div>

      <NotificationPanel
        notifications={(notifications ?? []) as PortalNotification[]}
        audience="customer"
      />
    </div>
  );
}
