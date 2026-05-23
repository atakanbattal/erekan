'use client';

import { useI18n } from '@/lib/i18n/context';
import { getOrderStatusLabel } from '@/lib/i18n/helpers';
import type { OrderStatus } from '@/lib/stages';

interface OrderStatusChartProps {
  counts: Record<OrderStatus, number>;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  active: '#3b82f6',
  on_hold: '#f59e0b',
  completed: '#10b981',
  shipped: '#8b5cf6',
  draft: '#94a3b8',
  cancelled: '#ef4444',
};

const DISPLAY_STATUSES: OrderStatus[] = ['active', 'on_hold', 'completed', 'shipped'];

export function OrderStatusChart({ counts }: OrderStatusChartProps) {
  const { t } = useI18n();
  const total = DISPLAY_STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0) || 1;

  let offset = 0;
  const segments = DISPLAY_STATUSES
    .filter((s) => (counts[s] ?? 0) > 0)
    .map((status) => {
      const value = counts[status] ?? 0;
      const pct = (value / total) * 100;
      const segment = { status, value, pct, offset, color: STATUS_COLORS[status] };
      offset += pct;
      return segment;
    });

  const gradient =
    segments.length > 0
      ? `conic-gradient(${segments
          .map((s) => `${s.color} ${s.offset}% ${s.offset + s.pct}%`)
          .join(', ')})`
      : 'conic-gradient(#e2e8f0 0% 100%)';

  return (
    <div className="order-status-chart">
      <div className="order-status-chart-donut" style={{ background: gradient }}>
        <div className="order-status-chart-center">
          <span className="order-status-chart-total">{total}</span>
          <span className="order-status-chart-total-label">{t('dashboard.totalOrders')}</span>
        </div>
      </div>
      <ul className="order-status-chart-legend">
        {DISPLAY_STATUSES.map((status) => {
          const value = counts[status] ?? 0;
          if (value === 0) return null;
          return (
            <li key={status} className="order-status-chart-legend-item">
              <span
                className="order-status-chart-legend-dot"
                style={{ background: STATUS_COLORS[status] }}
              />
              <span className="order-status-chart-legend-label">
                {getOrderStatusLabel(t, status)}
              </span>
              <span className="order-status-chart-legend-value">{value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
