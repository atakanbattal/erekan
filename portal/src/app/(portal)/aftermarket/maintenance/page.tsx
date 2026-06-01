import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { MaintenancePageClient } from '@/components/aftermarket/MaintenancePageClient';
import type { CustomerAsset, MaintenancePlan, MaintenanceRecord } from '@/lib/portal/types-ext';

export default async function MaintenancePage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const [{ data: assets }, { data: plans }, { data: records }] = await Promise.all([
    supabase.from('customer_assets').select('*').eq('customer_id', ctx.customerId),
    supabase
      .from('maintenance_plans')
      .select('*, customer_assets(asset_tag, title)')
      .eq('customer_id', ctx.customerId)
      .order('next_due_at', { ascending: true }),
    supabase
      .from('maintenance_records')
      .select('*, customer_assets(asset_tag, title), maintenance_plans(title)')
      .eq('customer_id', ctx.customerId)
      .order('performed_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('aftermarket.nav.maintenance')}</h1>
        <p className="portal-page-subtitle">{t('aftermarket.maintenance.subtitle')}</p>
      </div>
      <MaintenancePageClient
        customerId={ctx.customerId}
        assets={(assets ?? []) as CustomerAsset[]}
        plans={(plans ?? []) as MaintenancePlan[]}
        records={(records ?? []) as MaintenanceRecord[]}
      />
    </div>
  );
}
