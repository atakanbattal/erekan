import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { AssetDetailClient } from '@/components/aftermarket/AssetDetailClient';
import type {
  AssetBomLine,
  CustomerAsset,
  MaintenancePlan,
  MaintenanceRecord,
  ServiceCase,
  SparePartRequest,
} from '@/lib/portal/types-ext';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: asset } = await supabase
    .from('customer_assets')
    .select('*, orders(id, job_number, serial_number, status, current_stage, expected_delivery, traceability_token, shipped_at, title)')
    .eq('id', id)
    .eq('customer_id', ctx.customerId)
    .single();

  if (!asset) notFound();

  const [{ data: bom }, { data: cases }, { data: plans }, { data: records }, { data: partRequests }] =
    await Promise.all([
      supabase.from('asset_bom').select('*, spare_part_catalog(*)').eq('asset_id', id),
      supabase.from('service_cases').select('*').eq('asset_id', id).order('created_at', { ascending: false }),
      supabase.from('maintenance_plans').select('*').eq('asset_id', id).order('next_due_at'),
      supabase
        .from('maintenance_records')
        .select('*')
        .eq('asset_id', id)
        .order('performed_at', { ascending: false })
        .limit(5),
      supabase
        .from('spare_part_requests')
        .select('*, lines:spare_part_request_lines(*)')
        .eq('asset_id', id)
        .order('created_at', { ascending: false }),
    ]);

  return (
    <div className="portal-page">
      <AssetDetailClient
        asset={asset as CustomerAsset}
        bom={(bom ?? []) as AssetBomLine[]}
        cases={(cases ?? []) as ServiceCase[]}
        maintenancePlans={(plans ?? []) as MaintenancePlan[]}
        maintenanceRecords={(records ?? []) as MaintenanceRecord[]}
        partRequests={(partRequests ?? []) as SparePartRequest[]}
      />
    </div>
  );
}
