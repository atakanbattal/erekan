import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { buildBomByAsset } from '@/lib/aftermarket/bom';
import { PartsPageClient } from '@/components/aftermarket/PartsPageClient';
import { AdminPartsCatalog } from '@/components/aftermarket/AdminPartsCatalog';
import type { CustomerAsset, SparePartCatalogItem, SparePartRequest } from '@/lib/portal/types-ext';

export default async function AdminPartsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staff } = await supabase.from('staff_profiles').select('is_admin').eq('auth_user_id', user.id).single();
  if (!staff?.is_admin) redirect('/dashboard');

  const [{ data: assets }, { data: catalog }, { data: requests }, { data: bomLines }] = await Promise.all([
    supabase.from('customer_assets').select('*'),
    supabase.from('spare_part_catalog').select('*').order('part_number'),
    supabase
      .from('spare_part_requests')
      .select('*, lines:spare_part_request_lines(*), customers(company_name)')
      .order('created_at', { ascending: false }),
    supabase.from('asset_bom').select('asset_id, part_id'),
  ]);

  return (
    <div className="portal-page">
      <div className="mb-8">
        <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
        <h1 className="text-3xl font-black text-bone">{t('aftermarket.nav.parts')}</h1>
      </div>
      <AdminPartsCatalog
        catalog={(catalog ?? []) as SparePartCatalogItem[]}
        requests={(requests ?? []).map((r) => ({ id: r.id, request_number: r.request_number, status: r.status }))}
      />
      <Suspense>
        <PartsPageClient
          customerId=""
          assets={(assets ?? []) as CustomerAsset[]}
          catalog={(catalog ?? []).filter((p) => p.is_active) as SparePartCatalogItem[]}
          requests={(requests ?? []) as SparePartRequest[]}
          bomByAsset={buildBomByAsset(bomLines ?? [])}
          basePath="/admin/aftermarket"
          isAdmin
        />
      </Suspense>
    </div>
  );
}
