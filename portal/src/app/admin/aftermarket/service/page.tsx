import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { ServicePageClient } from '@/components/aftermarket/ServicePageClient';
import type { CustomerAsset, ServiceCase } from '@/lib/portal/types-ext';

export default async function AdminServicePage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staff } = await supabase.from('staff_profiles').select('is_admin, full_name').eq('auth_user_id', user.id).single();
  if (!staff?.is_admin) redirect('/dashboard');

  const [{ data: assets }, { data: cases }] = await Promise.all([
    supabase.from('customer_assets').select('*').order('title'),
    supabase
      .from('service_cases')
      .select('*, customer_assets(asset_tag, title, serial_number), customers(company_name)')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="portal-page">
      <div className="mb-8">
        <div className="eyebrow mb-2">{t('admin.panelEyebrow')}</div>
        <h1 className="text-3xl font-black text-bone">{t('aftermarket.nav.service')}</h1>
      </div>
      <Suspense>
        <ServicePageClient
          customerId=""
          assets={(assets ?? []) as CustomerAsset[]}
          cases={(cases ?? []) as ServiceCase[]}
          creatorName={staff.full_name}
          basePath="/admin/aftermarket"
          isAdmin
        />
      </Suspense>
    </div>
  );
}
