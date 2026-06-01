'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Package,
  Truck,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import type { ActionItem } from '@/lib/portal/actions';
import type { PortalActionType } from '@/lib/stages';

interface ActionInboxPanelProps {
  items: ActionItem[];
  variant?: 'customer' | 'admin';
}

function descriptionKey(item: ActionItem) {
  if (item.description === 'quote_review') return 'actions.descriptions.quoteReview';
  if (item.description === 'delivery_confirm') return 'actions.descriptions.deliveryConfirm';
  if (item.description === 'rfq_pending') return 'actions.descriptions.rfqPending';
  if (item.description === 'rfq_convert') return 'actions.descriptions.rfqConvert';
  if (item.actionType === 'order_delay_note') return 'actions.descriptions.delayNote';
  return 'actions.descriptions.general';
}

const ACTION_ICON: Partial<Record<PortalActionType, typeof Package>> = {
  rfq_quote_review: FileQuestion,
  rfq_convert: FileQuestion,
  order_delivery_confirm: Truck,
  order_delay_note: Clock3,
};

function actionAccent(actionType: PortalActionType) {
  if (actionType === 'order_delay_note') return 'border-l-danger text-danger bg-danger/10';
  if (actionType === 'rfq_convert' || actionType === 'rfq_quote_review') return 'border-l-arc-2 text-arc-2 bg-arc-2/10';
  return 'border-l-blue-500 text-blue-500 bg-blue-500/10';
}

export function ActionInboxPanel({ items, variant = 'customer' }: ActionInboxPanelProps) {
  const { t } = useI18n();
  const openItems = items.slice(0, variant === 'admin' ? 8 : 5);

  return (
    <section className="overflow-hidden rounded-xl border border-ink-4 border-l-4 border-l-arc-2 bg-ink-0 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-4 bg-ink-2/60 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-arc-2/10 text-arc-2">
            <AlertCircle size={18} aria-hidden />
          </span>
          <div>
            <h2 className="font-bold text-bone">{t('actions.title')}</h2>
            <p className="text-xs text-steel-2">{t('actions.subtitle')}</p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-danger/15 px-2.5 text-sm font-bold text-danger">
            {items.length}
          </span>
        )}
      </div>

      {openItems.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-steel-2">
          <CheckCircle2 size={20} className="shrink-0 text-success" aria-hidden />
          <p>{t('actions.empty')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-4">
          {openItems.map((item) => {
            const Icon = ACTION_ICON[item.actionType] ?? Package;
            const accent = actionAccent(item.actionType);
            return (
              <li key={item.id}>
                <Link
                  href={item.link}
                  className="group flex items-center gap-4 px-5 py-4 no-underline transition-colors hover:bg-ink-2/50"
                >
                  <span
                    className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-l-4',
                      accent,
                    ].join(' ')}
                  >
                    <Icon size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-bone">{item.title}</div>
                    <p className="mt-0.5 truncate text-xs text-steel-2">{t(descriptionKey(item))}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-arc-2">
                    {t('actions.open')}
                    <ArrowRight
                      size={14}
                      className="shrink-0 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {variant === 'admin' && items.length > 8 && (
        <p className="border-t border-ink-4 px-5 py-3 text-xs text-steel-2">
          {t('actions.more', { count: items.length - 8 })}
        </p>
      )}
    </section>
  );
}
