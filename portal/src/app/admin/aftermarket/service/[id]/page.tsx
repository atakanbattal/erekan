import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ServiceCaseDetailClient } from '@/components/aftermarket/ServiceCaseDetailClient';
import type { ServiceCase } from '@/lib/portal/types-ext';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminServiceCasePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staff } = await supabase.from('staff_profiles').select('is_admin, full_name').eq('auth_user_id', user.id).single();
  if (!staff?.is_admin) redirect('/dashboard');

  const { data: serviceCase } = await supabase
    .from('service_cases')
    .select('*, customer_assets(asset_tag, title, serial_number), customers(company_name), attachments:service_case_attachments(*), updates:service_case_updates(*)')
    .eq('id', id)
    .single();

  if (!serviceCase) notFound();

  const updates = (serviceCase.updates ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="portal-page">
      <ServiceCaseDetailClient
        serviceCase={{ ...serviceCase, updates } as ServiceCase}
        basePath="/admin/aftermarket"
        isAdmin
        staffName={staff.full_name}
      />
    </div>
  );
}
