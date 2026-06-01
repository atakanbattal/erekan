import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { SettingsPageClient } from './SettingsPageClient';
import type { NotificationPreference } from '@/lib/portal/types-ext';

export default async function SettingsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('auth_user_id', user.id);

  return (
    <div className="portal-page max-w-2xl">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('settingsPage.title')}</h1>
        <p className="portal-page-subtitle">{t('settingsPage.subtitle')}</p>
      </div>

      <SettingsPageClient
        context={ctx}
        notificationPrefs={(prefs ?? []) as NotificationPreference[]}
      />
    </div>
  );
}
