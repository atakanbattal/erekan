import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerContext } from '@/lib/portal/customer-context';
import { ServiceCaseDetailClient } from '@/components/aftermarket/ServiceCaseDetailClient';
import type { ServiceCase } from '@/lib/portal/types-ext';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceCasePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await resolveCustomerContext(user.id);
  if (!ctx) redirect('/dashboard');

  const { data: serviceCase } = await supabase
    .from('service_cases')
    .select('*, customer_assets(asset_tag, title, serial_number), attachments:service_case_attachments(*), updates:service_case_updates(*)')
    .eq('id', id)
    .eq('customer_id', ctx.customerId)
    .single();

  if (!serviceCase) notFound();

  const updates = (serviceCase.updates ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="portal-page">
      <ServiceCaseDetailClient serviceCase={{ ...serviceCase, updates } as ServiceCase} />
    </div>
  );
}
