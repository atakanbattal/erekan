import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerI18n } from '@/lib/i18n/server';
import { getLocalizedStages } from '@/lib/i18n/helpers';
import { buildTraceabilityChain } from '@/lib/portal/traceability';
import { TraceabilityPanel } from '@/components/portal/TraceabilityPanel';
import type { NdtRecord, Shipment, TraceabilityLink } from '@/lib/portal/types-ext';
import type { Order, OrderDocument, OrderStage } from '@/lib/types';

interface TracePageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicTracePage({ params }: TracePageProps) {
  const { token } = await params;
  const { t, dateLocale } = await getServerI18n();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(company_name)')
    .eq('traceability_token', token)
    .single();

  if (!order) notFound();

  const [{ data: stages }, { data: documents }, { data: ndtRecords }, { data: links }, { data: shipments }] =
    await Promise.all([
      supabase.from('order_stages').select('*').eq('order_id', order.id).order('stage_number'),
      supabase
        .from('order_documents')
        .select('*')
        .eq('order_id', order.id)
        .eq('is_visible_to_customer', true),
      supabase.from('ndt_records').select('*').eq('order_id', order.id).eq('is_visible_to_customer', true),
      supabase.from('traceability_links').select('*').eq('order_id', order.id),
      supabase.from('shipments').select('*').eq('order_id', order.id),
    ]);

  const localizedStages = getLocalizedStages(t);
  const stageLabels = Object.fromEntries(localizedStages.map((s) => [s.number, s.title]));

  const documentUrls: Record<string, string | null> = {};
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
  if (admin && documents?.length) {
    await Promise.all(
      documents.map(async (doc) => {
        const { data } = await admin.storage.from('order-documents').createSignedUrl(doc.file_path, 3600);
        documentUrls[doc.id] = data?.signedUrl ?? null;
      })
    );
  }

  const nodes = buildTraceabilityChain({
    order: order as Order,
    stages: (stages ?? []) as OrderStage[],
    documents: (documents ?? []) as OrderDocument[],
    ndtRecords: (ndtRecords ?? []) as NdtRecord[],
    links: (links ?? []) as TraceabilityLink[],
    shipments: (shipments ?? []) as Shipment[],
    stageLabels,
    documentUrls,
  });

  const customer = order.customers as { company_name?: string } | null;
  const docCount = (documents ?? []).length;

  return (
    <div className="min-h-screen bg-ink-1 text-bone">
      <div className="border-b border-ink-4 bg-ink-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="eyebrow">ArmaWeld</div>
            <div className="text-sm text-steel-2">{t('traceability.publicTitle')}</div>
          </div>
          {customer?.company_name && (
            <div className="hidden text-right text-sm text-steel-2 sm:block">{customer.company_name}</div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-bone sm:text-3xl">{t('traceability.publicTitle')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-steel-2">{t('traceability.publicDesc')}</p>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-ink-4 bg-ink-0 p-4 sm:col-span-2">
            <div className="font-mono text-sm font-semibold text-arc-2">{order.job_number}</div>
            <div className="mt-1 text-lg font-bold text-bone">{order.title}</div>
            {order.material && (
              <div className="mt-2 text-sm text-steel-2">
                {t('common.material')}: {order.material}
                {order.standard ? ` · ${order.standard}` : ''}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-ink-4 bg-ink-0 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-steel-2">
              {t('traceability.summary')}
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {order.heat_number && (
                <div>
                  <span className="text-steel-2">{t('common.heatNumber')}: </span>
                  <span className="font-mono text-bone">{order.heat_number}</span>
                </div>
              )}
              {order.wps_ref && (
                <div>
                  <span className="text-steel-2">WPS: </span>
                  <span className="font-mono text-bone">{order.wps_ref}</span>
                </div>
              )}
              <div>
                <span className="text-steel-2">{t('traceability.docCount')}: </span>
                <span className="font-semibold text-bone">{docCount}</span>
              </div>
              {order.shipped_at && (
                <div>
                  <span className="text-steel-2">{t('traceability.shipped')}: </span>
                  <span className="text-bone">
                    {format(new Date(order.shipped_at), 'dd MMM yyyy', { locale: dateLocale })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <TraceabilityPanel nodes={nodes} />
      </div>
    </div>
  );
}
