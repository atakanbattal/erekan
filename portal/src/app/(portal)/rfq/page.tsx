import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { RfqPageClient } from './RfqPageClient';
import type { RfqRequest } from '@/lib/portal/types-ext';

export default async function RfqPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: requests } = await supabase
    .from('rfq_requests')
    .select('*, attachments:rfq_attachments(*)')
    .eq('customer_id', ctx.customerId)
    .order('created_at', { ascending: false });

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('rfqPage.title')}</h1>
        <p className="portal-page-subtitle">{t('rfqPage.subtitle')}</p>
      </div>

      <RfqPageClient
        customerId={ctx.customerId}
        requests={(requests ?? []) as RfqRequest[]}
        responderName={ctx.contactName}
      />
    </div>
  );
}
