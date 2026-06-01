import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssetDetailClient } from '@/components/aftermarket/AssetDetailClient';
import type {
  AssetBomLine,
  CustomerAsset,
  MaintenancePlan,
  MaintenanceRecord,
  ServiceCase,
  SparePartCatalogItem,
  SparePartRequest,
} from '@/lib/portal/types-ext';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staff } = await supabase.from('staff_profiles').select('is_admin, full_name').eq('auth_user_id', user.id).single();
  if (!staff?.is_admin) redirect('/dashboard');

  const { data: asset } = await supabase
    .from('customer_assets')
    .select('*, customers(company_name), orders(id, job_number, serial_number, status, current_stage, expected_delivery, traceability_token, shipped_at, title)')
    .eq('id', id)
    .single();
  if (!asset) notFound();

  const [{ data: bom }, { data: cases }, { data: catalog }, { data: plans }, { data: records }, { data: partRequests }] =
    await Promise.all([
      supabase.from('asset_bom').select('*, spare_part_catalog(*)').eq('asset_id', id),
      supabase.from('service_cases').select('*').eq('asset_id', id).order('created_at', { ascending: false }),
      supabase.from('spare_part_catalog').select('*').eq('is_active', true).order('part_number'),
      supabase.from('maintenance_plans').select('*').eq('asset_id', id).order('next_due_at'),
      supabase
        .from('maintenance_records')
        .select('*')
        .eq('asset_id', id)
        .order('performed_at', { ascending: false })
        .limit(5),
      supabase
        .from('spare_part_requests')
        .select('*, lines:spare_part_request_lines(*), customers(company_name)')
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
        basePath="/admin/aftermarket"
        isAdmin
        catalog={(catalog ?? []) as SparePartCatalogItem[]}
      />
    </div>
  );
}
