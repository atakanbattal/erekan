'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  Calendar,
  FileText,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { getLocalizedStages, getDocTypeLabel } from '@/lib/i18n/helpers';
import type { Order, OrderDocument, OrderStage, PortalMessage } from '@/lib/types';

interface OrderStatusSummaryProps {
  order: Order;
  stages: OrderStage[];
  documents: OrderDocument[];
  unreadCount: number;
  latestMessage?: PortalMessage | null;
}

export function OrderStatusSummary({
  order,
  stages,
  documents,
  unreadCount,
  latestMessage,
}: OrderStatusSummaryProps) {
  const { t, dateLocale } = useI18n();
  const localizedStages = getLocalizedStages(t);
  const currentStageMeta = localizedStages.find((s) => s.number === order.current_stage);
  const currentStageRow = stages.find((s) => s.stage_number === order.current_stage);

  const visibleDocs = documents
    .filter((d) => d.is_visible_to_customer)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestDoc = visibleDocs[0];

  const items = [
    {
      key: 'stage',
      icon: Layers,
      label: t('orderSummary.currentStage'),
      value: currentStageMeta
        ? `${order.current_stage}/7 — ${currentStageMeta.title}`
        : `${order.current_stage}/7`,
      hint: currentStageRow?.status
        ? t(`stageStatus.${currentStageRow.status}`)
        : undefined,
    },
    {
      key: 'delivery',
      icon: Calendar,
      label: t('orderSummary.deliveryDate'),
      value: order.expected_delivery
        ? format(new Date(order.expected_delivery), 'd MMM yyyy', { locale: dateLocale })
        : '—',
    },
    {
      key: 'document',
      icon: FileText,
      label: t('orderSummary.latestDocument'),
      value: latestDoc
        ? latestDoc.name
        : t('orderSummary.noDocument'),
      hint: latestDoc ? getDocTypeLabel(t, latestDoc.document_type) : undefined,
    },
    {
      key: 'messages',
      icon: MessageSquare,
      label: t('orderSummary.unreadMessages'),
      value: unreadCount > 0 ? String(unreadCount) : t('orderSummary.noMessage'),
      href: '/messages',
    },
  ];

  return (
    <div className="card p-5">
      <h3 className="font-bold text-bone mb-4">{t('orderSummary.title')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ key, icon: Icon, label, value, hint, href }) => (
          <div
            key={key}
            className="rounded border border-ink-4 bg-ink-1 px-3 py-3 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded bg-arc-2/10 border border-arc-2/20 flex items-center justify-center shrink-0">
              <Icon size={16} className="text-arc-2" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="label">{label}</div>
              <div className="text-sm font-medium text-bone truncate">{value}</div>
              {hint && <div className="text-xs text-steel-2 mt-0.5">{hint}</div>}
              {href && unreadCount > 0 && (
                <Link href={href} className="text-xs text-arc-2 hover:underline mt-1 inline-block">
                  {t('orderSummary.viewMessages')}
                </Link>
              )}
              {key === 'messages' && latestMessage && unreadCount > 0 && (
                <p className="text-xs text-steel-2 mt-1 truncate">{latestMessage.subject}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
