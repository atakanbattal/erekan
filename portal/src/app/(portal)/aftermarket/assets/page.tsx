import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { AssetsPageClient } from '@/components/aftermarket/AssetsPageClient';
import type { CustomerAsset } from '@/lib/portal/types-ext';

export default async function AssetsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: assets } = await supabase
    .from('customer_assets')
    .select('*, orders(job_number, current_stage, status)')
    .eq('customer_id', ctx.customerId)
    .order('installed_at', { ascending: false });

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('aftermarket.nav.assets')}</h1>
        <p className="portal-page-subtitle">{t('aftermarket.assets.subtitle')}</p>
      </div>
      <AssetsPageClient assets={(assets ?? []) as CustomerAsset[]} />
    </div>
  );
}
