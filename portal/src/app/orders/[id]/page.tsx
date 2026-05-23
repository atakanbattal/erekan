import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Hash, Thermometer } from 'lucide-react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { ActivityFeed } from '@/components/ActivityFeed';
import { OrderFilesSection } from '@/components/OrderFilesSection';
import { getServerI18n } from '@/lib/i18n/server';
import type { Order, OrderActivity, OrderDocument, OrderStage } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { t, dateLocale } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(*)')
    .eq('id', id)
    .single();

  if (!order) notFound();

  const { data: customer } = await supabase
    .from('customers')
    .select('id, company_name, contact_name, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin && customer?.id !== order.customer_id) {
    notFound();
  }

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

  const typedOrder = order as Order & { customers: { company_name: string; contact_name: string | null } };

  return (
    <>
      <Header
        isAdmin={!!staff?.is_admin}
        userName={
          staff?.is_admin
            ? (staff.full_name ?? user.email ?? '')
            : (customer?.contact_name ?? user.email ?? '')
        }
        companyName={
          staff?.is_admin ? t('nav.adminCompany') : (customer?.company_name ?? typedOrder.customers?.company_name)
        }
      />
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={staff?.is_admin ? `/admin/orders/${id}` : '/dashboard'}
          className="inline-flex items-center gap-2 text-sm text-steel-2 hover:text-arc-2 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          {staff?.is_admin ? t('order.backToAdmin') : t('order.backToOrders')}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash size={16} className="text-arc-2" />
              <span className="font-mono text-arc-2">{typedOrder.job_number}</span>
              {typedOrder.serial_number && (
                <span className="font-mono text-sm text-steel-2">/ {typedOrder.serial_number}</span>
              )}
            </div>
            <h1 className="text-3xl font-black text-bone mb-2">{typedOrder.title}</h1>
            {typedOrder.description && (
              <p className="text-steel-2 max-w-2xl">{typedOrder.description}</p>
            )}
          </div>
          <StatusBadge status={typedOrder.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {typedOrder.material && (
            <div className="card p-4">
              <div className="label">{t('common.material')}</div>
              <div className="text-sm font-medium text-bone">{typedOrder.material}</div>
            </div>
          )}
          {typedOrder.standard && (
            <div className="card p-4">
              <div className="label">{t('common.standard')}</div>
              <div className="text-sm font-medium text-bone">{typedOrder.standard}</div>
            </div>
          )}
          {typedOrder.heat_number && (
            <div className="card p-4">
              <div className="label flex items-center gap-1">
                <Thermometer size={12} /> {t('common.heatNumber')}
              </div>
              <div className="text-sm font-mono text-bone">{typedOrder.heat_number}</div>
            </div>
          )}
          {typedOrder.expected_delivery && (
            <div className="card p-4">
              <div className="label flex items-center gap-1">
                <Calendar size={12} /> {t('common.deliveryDate')}
              </div>
              <div className="text-sm font-medium text-bone">
                {format(new Date(typedOrder.expected_delivery), 'd MMMM yyyy', { locale: dateLocale })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="card p-6 sm:p-8">
            <div className="eyebrow mb-4">{t('order.timelineEyebrow')}</div>
            <h2 className="text-xl font-bold text-bone mb-6">
              {t('order.timelineTitle', { current: typedOrder.current_stage })}
            </h2>
            <Timeline
              stages={(stages ?? []) as OrderStage[]}
              currentStage={typedOrder.current_stage}
              documents={(documents ?? []) as OrderDocument[]}
              orderId={id}
              jobNumber={typedOrder.job_number}
            />
          </div>

          {(activities ?? []).length > 0 && (
            <ActivityFeed
              activities={activities as OrderActivity[]}
              isCustomerView={!staff?.is_admin}
            />
          )}

          <OrderFilesSection
            mode="customer"
            orderId={id}
            jobNumber={typedOrder.job_number}
            documents={(documents ?? []) as OrderDocument[]}
          />
        </div>
      </main>
    </>
  );
}
