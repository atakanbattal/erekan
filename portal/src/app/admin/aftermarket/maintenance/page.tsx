import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { MaintenancePageClient } from '@/components/aftermarket/MaintenancePageClient';
import type { CustomerAsset, MaintenancePlan, MaintenanceRecord } from '@/lib/portal/types-ext';

export default async function AdminMaintenancePage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staff } = await supabase.from('staff_profiles').select('is_admin').eq('auth_user_id', user.id).single();
  if (!staff?.is_admin) redirect('/dashboard');

  const [{ data: assets }, { data: plans }, { data: records }] = await Promise.all([
    supabase.from('customer_assets').select('*'),
    supabase.from('maintenance_plans').select('*, customer_assets(asset_tag, title)').order('next_due_at'),
    supabase
      .from('maintenance_records')
      .select('*, customer_assets(asset_tag, title), maintenance_plans(title)')
      .order('performed_at', { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="portal-page">
      <div className="mb-8">
        <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
        <h1 className="text-3xl font-black text-bone">{t('aftermarket.nav.maintenance')}</h1>
      </div>
      <MaintenancePageClient
        customerId=""
        assets={(assets ?? []) as CustomerAsset[]}
        plans={(plans ?? []) as MaintenancePlan[]}
        records={(records ?? []) as MaintenanceRecord[]}
        basePath="/admin/aftermarket"
        isAdmin
      />
    </div>
  );
}
