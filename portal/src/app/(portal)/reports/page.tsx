import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { buildPerformanceReport } from '@/lib/portal/performance-report';
import { PerformanceReportPanel } from '@/components/portal/PerformanceReportPanel';
import type { Order } from '@/lib/types';

export default async function ReportsPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', ctx.customerId)
    .order('updated_at', { ascending: false });

  const report = buildPerformanceReport((orders ?? []) as Order[]);

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('reports.title')}</h1>
        <p className="portal-page-subtitle">{t('reports.subtitle')}</p>
      </div>
      <PerformanceReportPanel report={report} />
    </div>
  );
}
