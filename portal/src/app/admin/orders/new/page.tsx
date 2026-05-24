import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { NewOrderForm } from '@/components/admin/NewOrderForm';
import { getServerI18n } from '@/lib/i18n/server';
import type { Customer } from '@/lib/types';

export default async function NewOrderPage() {
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

  const [{ data: customers }, { data: templates }] = await Promise.all([
    supabase.from('customers').select('*').eq('is_active', true).order('company_name'),
    supabase.from('order_templates').select('*').order('name'),
  ]);

  return (
    <div className="portal-page">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm text-steel-2 hover:text-arc-2 mb-6"
        >
          <ArrowLeft size={16} /> {t('admin.backToOrders')}
        </Link>
        <div className="mb-6">
          <div className="eyebrow mb-2">{t('admin.newOrder')}</div>
          <h1 className="text-2xl font-black text-bone">{t('admin.newOrderPage')}</h1>
        </div>
        <NewOrderForm
          customers={(customers ?? []) as Customer[]}
          staffName={staff.full_name}
          templates={templates ?? []}
        />
    </div>
  );
}
