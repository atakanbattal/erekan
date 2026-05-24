import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { NotificationPanel } from '@/components/portal/NotificationPanel';
import type { PortalNotification } from '@/lib/portal/types-ext';

export default async function AdminNotificationsPage() {
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

  if (!staff?.is_admin) redirect('/dashboard');

  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('portal_notifications')
      .select('*')
      .eq('audience', 'admin')
      .order('created_at', { ascending: false }),
    supabase
      .from('portal_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('audience', 'admin')
      .eq('is_read', false),
  ]);

  return (
    <div className="portal-page max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="eyebrow">{t('admin.panelEyebrow')}</div>
          {(unreadCount ?? 0) > 0 && (
            <span className="portal-sidebar-badge">{unreadCount}</span>
          )}
        </div>
        <h1 className="text-3xl font-black text-bone">{t('adminNotificationsPage.title')}</h1>
        <p className="text-steel-2 mt-1">{t('adminNotificationsPage.subtitle')}</p>
      </div>

      <NotificationPanel
        notifications={(notifications ?? []) as PortalNotification[]}
        audience="admin"
      />
    </div>
  );
}
