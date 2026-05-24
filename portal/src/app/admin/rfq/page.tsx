import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { AdminRfqPageClient } from './AdminRfqPageClient';
import type { RfqRequest } from '@/lib/portal/types-ext';

export default async function AdminRfqPage() {
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

  const { data: requests } = await supabase
    .from('rfq_requests')
    .select('*, customers(company_name, contact_name, email)')
    .order('created_at', { ascending: false });

  return (
    <div className="portal-page">
      <div className="mb-8">
        <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
        <h1 className="text-3xl font-black text-bone">{t('adminRfqPage.title')}</h1>
        <p className="text-steel-2 mt-1">{t('adminRfqPage.subtitle')}</p>
      </div>

      <AdminRfqPageClient requests={(requests ?? []) as RfqRequest[]} />
    </div>
  );
}
