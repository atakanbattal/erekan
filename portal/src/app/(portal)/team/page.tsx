import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { TeamPageClient } from './TeamPageClient';
import type { CustomerUser } from '@/lib/portal/types-ext';

export default async function TeamPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: members } = await supabase
    .from('customer_users')
    .select('*')
    .eq('customer_id', ctx.customerId)
    .order('created_at', { ascending: true });

  return (
    <div className="portal-page max-w-3xl">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('teamPage.title')}</h1>
        <p className="portal-page-subtitle">{t('teamPage.subtitle')}</p>
      </div>

      <TeamPageClient
        members={(members ?? []) as CustomerUser[]}
        canInvite={ctx.userRole === 'owner'}
      />
    </div>
  );
}
