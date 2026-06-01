import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { AftermarketOverview } from '@/components/aftermarket/AftermarketOverview';
import type {
  CustomerAsset,
  MaintenancePlan,
  ServiceCase,
  SparePartRequest,
} from '@/lib/portal/types-ext';

export default async function AftermarketPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const [{ data: assets }, { data: cases }, { data: plans }, { data: partReqs }] = await Promise.all([
    supabase
      .from('customer_assets')
      .select('*')
      .eq('customer_id', ctx.customerId)
      .order('installed_at', { ascending: false }),
    supabase
      .from('service_cases')
      .select('*, customer_assets(asset_tag, title, serial_number)')
      .eq('customer_id', ctx.customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('maintenance_plans')
      .select('*, customer_assets(asset_tag, title)')
      .eq('customer_id', ctx.customerId)
      .eq('status', 'active')
      .order('next_due_at', { ascending: true }),
    supabase
      .from('spare_part_requests')
      .select('*, lines:spare_part_request_lines(*)')
      .eq('customer_id', ctx.customerId)
      .in('status', ['submitted', 'quoted'])
      .order('created_at', { ascending: false }),
  ]);

  const openCases = (cases ?? []).filter((c) =>
    ['submitted', 'triage', 'assigned', 'in_progress', 'waiting_parts', 'resolved'].includes(c.status)
  ) as ServiceCase[];

  const duePlans = (plans ?? []).filter((p) => {
    if (!p.next_due_at) return false;
    const due = new Date(p.next_due_at);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);
    return due <= horizon;
  }) as MaintenancePlan[];

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('aftermarket.title')}</h1>
        <p className="portal-page-subtitle">{t('aftermarket.subtitle')}</p>
      </div>
      <AftermarketOverview
        assets={(assets ?? []) as CustomerAsset[]}
        openCases={openCases}
        duePlans={duePlans}
        pendingParts={(partReqs ?? []) as SparePartRequest[]}
      />
    </div>
  );
}
