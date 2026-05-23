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
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const max = Math.max(...DISPLAY_STATUSES.map((s) => counts[s] ?? 0), 1);

  if (total === 0) {
    return <div className="portal-empty-state">{t('dashboard.noOrders')}</div>;
  }

  return (
    <div className="order-status-bars">
      <div className="order-status-bars-summary">
        <span className="order-status-bars-total">{total}</span>
        <span className="order-status-bars-total-label">{t('dashboard.totalOrders')}</span>
      </div>
      <ul className="order-status-bars-list">
        {DISPLAY_STATUSES.map((status) => {
          const value = counts[status] ?? 0;
          if (value === 0) return null;
          const pct = Math.round((value / max) * 100);
          return (
            <li key={status} className="order-status-bar-item">
              <div className="order-status-bar-meta">
                <span className="order-status-bar-label">
                  {getOrderStatusLabel(t, status)}
                </span>
                <span className="order-status-bar-value">{value}</span>
              </div>
              <div className="order-status-bar-track">
                <div
                  className="order-status-bar-fill"
                  style={{ width: `${pct}%`, background: STATUS_COLORS[status] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
