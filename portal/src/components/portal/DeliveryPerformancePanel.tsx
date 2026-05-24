'use client';

import { Truck, TrendingUp, CalendarClock, FileCheck2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import type { DeliveryMetrics } from '@/lib/portal/delivery-metrics';

interface DeliveryPerformancePanelProps {
  metrics: DeliveryMetrics;
}

export function DeliveryPerformancePanel({ metrics }: DeliveryPerformancePanelProps) {
  const { t } = useI18n();

  const cards = [
    {
      icon: Truck,
      color: 'green',
      label: t('dashboard.onTimeDelivery'),
      value:
        metrics.onTimeRate != null
          ? `%${metrics.onTimeRate}`
          : t('dashboard.noDataYet'),
      hint:
        metrics.finishedWithDate > 0
          ? t('dashboard.onTimeHint', {
              onTime: metrics.onTimeCount,
              total: metrics.finishedWithDate,
            })
          : t('dashboard.onTimeHintEmpty'),
    },
    {
      icon: TrendingUp,
      color: 'blue',
      label: t('dashboard.avgProduction'),
      value: `%${metrics.avgProductionProgress}`,
      hint: t('dashboard.avgProductionHint', { count: metrics.activeOrders }),
    },
    {
      icon: CalendarClock,
      color: 'amber',
      label: t('dashboard.upcomingDeliveries'),
      value: String(metrics.upcomingDeliveries),
      hint: t('dashboard.upcomingDeliveriesHint'),
    },
    {
      icon: FileCheck2,
      color: 'purple',
      label: t('dashboard.documentsShared'),
      value: String(metrics.documentCount),
      hint: t('dashboard.documentsSharedHint'),
    },
  ];

  return (
    <div>
      <div className="delivery-performance-grid">
        {cards.map(({ icon: Icon, color, label, value, hint }) => (
          <div key={label} className={`delivery-performance-card delivery-performance-card--${color}`}>
            <div className="delivery-performance-icon">
              <Icon size={20} />
            </div>
            <div className="delivery-performance-body">
              <div className="delivery-performance-value">{value}</div>
              <div className="delivery-performance-label">{label}</div>
              <div className="delivery-performance-hint">{hint}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-right">
        <a
          href="/api/reports/delivery-performance"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-arc-2 hover:underline"
        >
          {t('dashboard.downloadReport')} →
        </a>
      </div>
    </div>
  );
}
