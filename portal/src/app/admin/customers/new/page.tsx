import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { NewCustomerForm } from '@/components/admin/NewCustomerForm';
import { getServerI18n } from '@/lib/i18n/server';

export default async function NewCustomerPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) redirect('/dashboard');

  return (
    <>
      <Header isAdmin userName={staff.full_name} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-sm text-steel-2 hover:text-arc-2 mb-6"
        >
          <ArrowLeft size={16} /> {t('admin.backToCustomers')}
        </Link>
        <div className="mb-6">
          <div className="eyebrow mb-2">{t('admin.newCustomer')}</div>
          <h1 className="text-2xl font-black text-bone">{t('admin.newCustomerPage')}</h1>
          <p className="text-sm text-steel-2 mt-1">{t('admin.createCustomerDesc')}</p>
        </div>
        <NewCustomerForm />
      </main>
    </>
  );
}
