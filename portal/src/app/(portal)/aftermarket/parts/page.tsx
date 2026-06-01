import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { buildBomByAsset } from '@/lib/aftermarket/bom';
import { PartsPageClient } from '@/components/aftermarket/PartsPageClient';
import type { CustomerAsset, SparePartCatalogItem, SparePartRequest } from '@/lib/portal/types-ext';

export default async function PartsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const [{ data: assets }, { data: catalog }, { data: requests }] = await Promise.all([
    supabase.from('customer_assets').select('*').eq('customer_id', ctx.customerId),
    supabase.from('spare_part_catalog').select('*').eq('is_active', true).order('part_number'),
    supabase
      .from('spare_part_requests')
      .select('*, lines:spare_part_request_lines(*)')
      .eq('customer_id', ctx.customerId)
      .order('created_at', { ascending: false }),
  ]);

  const assetIds = (assets ?? []).map((a) => a.id);
  const { data: bomLines } = assetIds.length
    ? await supabase.from('asset_bom').select('asset_id, part_id').in('asset_id', assetIds)
    : { data: [] };

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('aftermarket.nav.parts')}</h1>
        <p className="portal-page-subtitle">{t('aftermarket.parts.subtitle')}</p>
      </div>
      <Suspense>
        <PartsPageClient
          customerId={ctx.customerId}
          assets={(assets ?? []) as CustomerAsset[]}
          catalog={(catalog ?? []) as SparePartCatalogItem[]}
          requests={(requests ?? []) as SparePartRequest[]}
          bomByAsset={buildBomByAsset(bomLines ?? [])}
        />
      </Suspense>
    </div>
  );
}
