import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { AftermarketOverview } from '@/components/aftermarket/AftermarketOverview';
import type {
  CustomerAsset,
  MaintenancePlan,
  ServiceCase,
  SparePartRequest,
} from '@/lib/portal/types-ext';

async function requireAdmin() {
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
  return supabase;
}

export default async function AdminAftermarketPage() {
  const { t } = await getServerI18n();
  const supabase = await requireAdmin();

  const [{ data: assets }, { data: cases }, { data: plans }, { data: partReqs }] = await Promise.all([
    supabase.from('customer_assets').select('*').order('updated_at', { ascending: false }).limit(100),
    supabase
      .from('service_cases')
      .select('*, customer_assets(asset_tag, title, serial_number), customers(company_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('maintenance_plans')
      .select('*, customer_assets(asset_tag, title)')
      .eq('status', 'active')
      .order('next_due_at', { ascending: true }),
    supabase
      .from('spare_part_requests')
      .select('*, lines:spare_part_request_lines(*), customers(company_name)')
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
      <div className="mb-8">
        <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
        <h1 className="text-3xl font-black text-bone">{t('aftermarket.title')}</h1>
        <p className="text-steel-2 mt-1">{t('aftermarket.admin.subtitle')}</p>
      </div>
      <AftermarketOverview
        assets={(assets ?? []) as CustomerAsset[]}
        openCases={openCases}
        duePlans={duePlans}
        pendingParts={(partReqs ?? []) as SparePartRequest[]}
        basePath="/admin/aftermarket"
      />
    </div>
  );
}
