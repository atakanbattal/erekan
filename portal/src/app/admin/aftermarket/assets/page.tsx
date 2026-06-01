import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { AssetsPageClient } from '@/components/aftermarket/AssetsPageClient';
import type { CustomerAsset } from '@/lib/portal/types-ext';

export default async function AdminAssetsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staff } = await supabase.from('staff_profiles').select('is_admin').eq('auth_user_id', user.id).single();
  if (!staff?.is_admin) redirect('/dashboard');

  const { data: assets } = await supabase
    .from('customer_assets')
    .select('*, customers(company_name), orders(job_number, current_stage, status)')
    .order('installed_at', { ascending: false });

  return (
    <div className="portal-page">
      <div className="mb-8">
        <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
        <h1 className="text-3xl font-black text-bone">{t('aftermarket.nav.assets')}</h1>
      </div>
      <AssetsPageClient assets={(assets ?? []) as CustomerAsset[]} basePath="/admin/aftermarket" isAdmin />
    </div>
  );
}
