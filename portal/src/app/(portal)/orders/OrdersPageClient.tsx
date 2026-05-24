'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, Search } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useI18n } from '@/lib/i18n/context';
import { getLocalizedStages } from '@/lib/i18n/helpers';
import type { Order } from '@/lib/types';

interface OrdersPageClientProps {
  orders: Order[];
}

export function OrdersPageClient({ orders }: OrdersPageClientProps) {
  const { t, dateLocale } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const stages = getLocalizedStages(t);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const haystack = [
        order.job_number,
        order.serial_number,
        order.title,
        order.material,
        order.status,
        stages.find((s) => s.number === order.current_stage)?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [orders, searchQuery, stages]);

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('dashboard.ordersPageTitle')}</h1>
        <p className="portal-page-subtitle">{t('dashboard.ordersPageSubtitle')}</p>
      </div>

      {orders.length > 0 && (
        <div className="orders-toolbar mb-6">
          <div className="orders-search">
            <Search size={16} className="orders-search-icon" />
            <input
              type="search"
              className="input orders-search-input"
              placeholder={t('dashboard.searchOrders')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="orders-count text-sm text-steel-2">
            {t('dashboard.ordersCount', { count: filtered.length, total: orders.length })}
          </span>
        </div>
      )}

      {!orders.length ? (
        <div className="card p-12 text-center">
          <p className="text-steel-2">{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="orders-table w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-ink-4 bg-ink-3">
                  <th className="text-left p-4 table-head">{t('dashboard.orderJobNumber')}</th>
                  <th className="text-left p-4 table-head">{t('dashboard.orderTitle')}</th>
                  <th className="text-left p-4 table-head hidden md:table-cell">
                    {t('common.status')}
                  </th>
                  <th className="text-left p-4 table-head hidden lg:table-cell">
                    {t('common.stage')}
                  </th>
                  <th className="text-left p-4 table-head hidden sm:table-cell">
                    {t('dashboard.orderDelivery')}
                  </th>
                  <th className="text-left p-4 table-head"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-steel-2">
                      {t('dashboard.noOrderResults')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const currentStage = stages.find((s) => s.number === order.current_stage);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-ink-4 hover:bg-ink-3/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-mono text-arc-2">{order.job_number}</div>
                          {order.serial_number && (
                            <div className="font-mono text-xs text-steel-2 mt-0.5">
                              {order.serial_number}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-bone font-medium">{order.title}</div>
                          {order.material && (
                            <div className="text-xs text-steel-2 mt-0.5">{order.material}</div>
                          )}
                          <div className="md:hidden mt-2">
                            <StatusBadge status={order.status} />
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <div className="text-steel-2">
                            {order.current_stage}/7 — {currentStage?.title}
                          </div>
                          <div className="orders-table-progress mt-1.5">
                            <div
                              className="orders-table-progress-bar"
                              style={{ width: `${(order.current_stage / 7) * 100}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-4 text-steel-2 hidden sm:table-cell">
                          {order.expected_delivery
                            ? format(new Date(order.expected_delivery), 'd MMM yyyy', {
                                locale: dateLocale,
                              })
                            : '—'}
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-arc-2 hover:underline text-sm inline-flex items-center gap-1"
                          >
                            {t('common.detail')} <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
