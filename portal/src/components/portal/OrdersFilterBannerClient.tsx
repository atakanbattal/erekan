'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface OrdersFilterBannerClientProps {
  labelKey: string;
  count: number;
  total: number;
  clearHref?: string;
}

export function OrdersFilterBannerClient({
  labelKey,
  count,
  total,
  clearHref = '/orders',
}: OrdersFilterBannerClientProps) {
  const { t } = useI18n();

  return (
    <div className="orders-filter-banner mb-4">
      <div className="orders-filter-banner-main">
        <span className="orders-filter-banner-label">{t('orders.filterActive', { label: t(labelKey) })}</span>
        <span className="orders-filter-banner-count">
          {t('orders.filterCount', { count, total })}
        </span>
      </div>
      <Link href={clearHref} className="orders-filter-banner-clear">
        <X size={14} />
        {t('orders.filterClear')}
      </Link>
    </div>
  );
}
