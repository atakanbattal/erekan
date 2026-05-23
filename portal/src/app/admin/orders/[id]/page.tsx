import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { AdminOrderDetail } from '@/components/admin/AdminOrderDetail';
import { getServerI18n } from '@/lib/i18n/server';
import type { Order, OrderActivity, OrderDocument, OrderStage } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(company_name, email)')
    .eq('id', id)
    .single();

  if (!order) notFound();

  const [{ data: stages }, { data: documents }, { data: activities }] = await Promise.all([
    supabase.from('order_stages').select('*').eq('order_id', id).order('stage_number'),
    supabase
      .from('order_documents')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('order_activity')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <Header isAdmin userName={staff.full_name} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm text-steel-2 hover:text-arc-2 mb-6"
        >
          <ArrowLeft size={16} /> {t('admin.backToOrders')}
        </Link>
        <AdminOrderDetail
          order={order as Order & { customers: { company_name: string; email: string } }}
          stages={(stages ?? []) as OrderStage[]}
          documents={(documents ?? []) as OrderDocument[]}
          staffName={staff.full_name}
          activities={(activities ?? []) as OrderActivity[]}
        />
      </main>
    </>
  );
}
