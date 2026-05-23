'use client';

import type { OrderStatus } from '@/lib/stages';
import { useI18n } from '@/lib/i18n/context';
import { getOrderStatusLabel } from '@/lib/i18n/helpers';

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-steel-1/20 text-steel-3 border-steel-1/30',
  active: 'bg-arc-2/15 text-arc-3 border-arc-2/30',
  on_hold: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-success/15 text-success border-success/30',
  shipped: 'bg-success/20 text-success border-success/40',
  cancelled: 'bg-danger/15 text-danger border-danger/30',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono uppercase tracking-wide border ${STATUS_COLORS[status]}`}
    >
      {getOrderStatusLabel(t, status)}
    </span>
  );
}
