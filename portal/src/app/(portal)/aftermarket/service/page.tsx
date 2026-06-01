import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { ServicePageClient } from '@/components/aftermarket/ServicePageClient';
import type { CustomerAsset, ServiceCase } from '@/lib/portal/types-ext';

export default async function ServicePage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const [{ data: assets }, { data: cases }] = await Promise.all([
    supabase.from('customer_assets').select('*').eq('customer_id', ctx.customerId).order('title'),
    supabase
      .from('service_cases')
      .select('*, customer_assets(asset_tag, title, serial_number)')
      .eq('customer_id', ctx.customerId)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('aftermarket.nav.service')}</h1>
        <p className="portal-page-subtitle">{t('aftermarket.service.subtitle')}</p>
      </div>
      <Suspense>
        <ServicePageClient
          customerId={ctx.customerId}
          assets={(assets ?? []) as CustomerAsset[]}
          cases={(cases ?? []) as ServiceCase[]}
          creatorName={ctx.contactName}
        />
      </Suspense>
    </div>
  );
}
