'use client';

import Link from 'next/link';
import { Truck, TrendingUp, CalendarClock, FileCheck2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { buildOrdersListHref } from '@/lib/portal/order-list-filters';
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
      href: buildOrdersListHref({ filter: 'finished', basePath: '/orders' }),
    },
    {
      icon: TrendingUp,
      color: 'blue',
      label: t('dashboard.avgProduction'),
      value: `%${metrics.avgProductionProgress}`,
      hint: t('dashboard.avgProductionHint', { count: metrics.activeOrders }),
      href: buildOrdersListHref({ status: 'active', basePath: '/orders' }),
    },
    {
      icon: CalendarClock,
      color: 'amber',
      label: t('dashboard.upcomingDeliveries'),
      value: String(metrics.upcomingDeliveries),
      hint: t('dashboard.upcomingDeliveriesHint'),
      href: buildOrdersListHref({ filter: 'upcoming_delivery', basePath: '/orders' }),
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
        {cards.map(({ icon: Icon, color, label, value, hint, href }) => {
          const content = (
            <>
              <div className={`delivery-performance-card delivery-performance-card--${color}`}>
                <div className="delivery-performance-icon">
                  <Icon size={20} />
                </div>
                <div className="delivery-performance-body">
                  <div className="delivery-performance-value">{value}</div>
                  <div className="delivery-performance-label">{label}</div>
                  <div className="delivery-performance-hint">{hint}</div>
                </div>
              </div>
            </>
          );

          if (!href) {
            return <div key={label}>{content}</div>;
          }

          return (
            <Link key={label} href={href} className="delivery-performance-link">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
