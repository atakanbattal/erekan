'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Hash } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { useI18n } from '@/lib/i18n/context';
import { getLocalizedStages } from '@/lib/i18n/helpers';

interface OrderCardProps {
  order: Order;
  href: string;
}

export function OrderCard({ order, href }: OrderCardProps) {
  const { t, dateLocale } = useI18n();
  const stages = getLocalizedStages(t);
  const currentStage = stages.find((s) => s.number === order.current_stage);
  const progress = (order.current_stage / 7) * 100;

  return (
    <Link href={href} className="card block p-5 hover:border-arc-2/40 transition-colors group">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hash size={14} className="text-arc-2" />
            <span className="font-mono text-sm text-arc-2">{order.job_number}</span>
            {order.serial_number && (
              <span className="font-mono text-xs text-steel-2">/ {order.serial_number}</span>
            )}
          </div>
          <h3 className="text-lg font-bold text-bone group-hover:text-arc-3 transition-colors">
            {order.title}
          </h3>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.material && (
        <p className="text-sm text-steel-2 mb-3">{order.material}</p>
      )}

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-steel-2">
            {t('order.stageProgress', { current: order.current_stage })}
          </span>
          <span className="text-bone font-medium">{currentStage?.title}</span>
        </div>
        <div className="h-1.5 bg-ink-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-arc-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-steel-2">
        {order.expected_delivery && (
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {t('common.delivery')}:{' '}
            {format(new Date(order.expected_delivery), 'd MMM yyyy', { locale: dateLocale })}
          </span>
        )}
        <span className="flex items-center gap-1 text-arc-2 group-hover:gap-2 transition-all ml-auto">
          {t('common.detail')} <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
