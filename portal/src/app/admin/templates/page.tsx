import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { TemplatesPageClient } from './TemplatesPageClient';
import type { OrderTemplate } from '@/lib/portal/types-ext';

export default async function AdminTemplatesPage() {
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

  const { data: templates } = await supabase
    .from('order_templates')
    .select('*')
    .order('name');

  return (
    <div className="portal-page">
      <div className="mb-8">
        <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
        <h1 className="text-3xl font-black text-bone">{t('templatesPage.title')}</h1>
        <p className="text-steel-2 mt-1">{t('templatesPage.subtitle')}</p>
      </div>

      <TemplatesPageClient templates={(templates ?? []) as OrderTemplate[]} />
    </div>
  );
}
