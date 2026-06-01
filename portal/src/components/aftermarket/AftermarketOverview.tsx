'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Box,
  CalendarClock,
  ClipboardList,
  Package,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketNav } from '@/components/aftermarket/AftermarketNav';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { actionLinkPrimary, actionLinkSecondary } from '@/components/aftermarket/ui';
import { isWarrantyActive, warrantyDaysRemaining } from '@/lib/aftermarket/warranty';
import type {
  CustomerAsset,
  MaintenancePlan,
  ServiceCase,
  SparePartRequest,
} from '@/lib/portal/types-ext';

interface AftermarketOverviewProps {
  assets: CustomerAsset[];
  openCases: ServiceCase[];
  duePlans: MaintenancePlan[];
  pendingParts: SparePartRequest[];
  basePath?: string;
}

export function AftermarketOverview({
  assets,
  openCases,
  duePlans,
  pendingParts,
  basePath = '/aftermarket',
}: AftermarketOverviewProps) {
  const { t, dateLocale } = useI18n();
  const activeWarranty = assets.filter(isWarrantyActive).length;
  const isCustomer = !basePath.includes('/admin');

  const stats = [
    {
      icon: Package,
      color: 'blue',
      label: t('aftermarket.stats.assets'),
      value: String(assets.length),
      href: `${basePath}/assets`,
    },
    {
      icon: ShieldCheck,
      color: 'green',
      label: t('aftermarket.stats.warrantyActive'),
      value: String(activeWarranty),
      href: `${basePath}/assets`,
    },
    {
      icon: Wrench,
      color: 'amber',
      label: t('aftermarket.stats.openCases'),
      value: String(openCases.length),
      href: `${basePath}/service`,
    },
    {
      icon: CalendarClock,
      color: 'purple',
      label: t('aftermarket.stats.dueMaintenance'),
      value: String(duePlans.length),
      href: `${basePath}/maintenance`,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <AftermarketNav basePath={basePath} />

      {isCustomer && (
        <div className="card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-bone">{t('aftermarket.quickActionsTitle')}</h2>
            <p className="mt-0.5 text-sm text-steel-2">{t('aftermarket.quickActionsDesc')}</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <Link href={`${basePath}/service?new=1`} className={actionLinkPrimary}>
              <Wrench size={16} className="shrink-0" aria-hidden />
              {t('aftermarket.assets.actions.service')}
            </Link>
            <Link href={`${basePath}/parts?new=1`} className={actionLinkSecondary}>
              <ClipboardList size={16} className="shrink-0" aria-hidden />
              {t('aftermarket.assets.actions.parts')}
            </Link>
          </div>
        </div>
      )}

      <div className="delivery-performance-grid">
        {stats.map(({ icon: Icon, color, label, value, href }) => (
          <Link key={label} href={href} className="delivery-performance-link">
            <div className={`delivery-performance-card delivery-performance-card--${color}`}>
              <div className="delivery-performance-icon">
                <Icon size={20} className="shrink-0" aria-hidden />
              </div>
              <div className="delivery-performance-body">
                <div className="delivery-performance-value">{value}</div>
                <div className="delivery-performance-label">{label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold text-bone">{t('aftermarket.recentAssets')}</h2>
            <Link href={`${basePath}/assets`} className="shrink-0 text-sm font-semibold text-arc-2 no-underline hover:underline">
              {t('aftermarket.viewAll')} →
            </Link>
          </div>
          {assets.length === 0 ? (
            <p className="text-sm text-steel-2">{t('aftermarket.assets.empty')}</p>
          ) : (
            <ul className="m-0 list-none divide-y divide-ink-4 p-0">
              {assets.slice(0, 5).map((asset) => {
                const days = warrantyDaysRemaining(asset);
                const warrantyOk = isWarrantyActive(asset);
                return (
                  <li key={asset.id}>
                    <Link
                      href={`${basePath}/assets/${asset.id}`}
                      className="flex items-center justify-between gap-3 py-3 no-underline transition-colors hover:bg-ink-2 rounded-lg px-1 -mx-1"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-bone">{asset.title}</div>
                        <div className="truncate text-xs text-steel-2">
                          {asset.asset_tag}
                          {asset.serial_number ? ` · ${asset.serial_number}` : ''}
                        </div>
                      </div>
                      <span
                        className={[
                          'shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold',
                          warrantyOk ? 'bg-success/10 text-success' : 'bg-ink-2 text-steel-2',
                        ].join(' ')}
                      >
                        {warrantyOk
                          ? t('aftermarket.assets.warrantyDays', { days: days ?? 0 })
                          : t('aftermarket.assets.warrantyExpired')}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold text-bone">{t('aftermarket.openServiceCases')}</h2>
            <Link href={`${basePath}/service`} className="shrink-0 text-sm font-semibold text-arc-2 no-underline hover:underline">
              {t('aftermarket.viewAll')} →
            </Link>
          </div>
          {openCases.length === 0 ? (
            <p className="text-sm text-steel-2">{t('aftermarket.service.noOpen')}</p>
          ) : (
            <ul className="m-0 list-none divide-y divide-ink-4 p-0">
              {openCases.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`${basePath}/service/${c.id}`}
                    className="flex items-center justify-between gap-3 py-3 no-underline transition-colors hover:bg-ink-2 rounded-lg px-1 -mx-1"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-bone">{c.case_number}</div>
                      <div className="truncate text-xs text-steel-2">{c.subject}</div>
                    </div>
                    <span className="shrink-0 text-xs text-steel-2">
                      {format(new Date(c.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {duePlans.length > 0 && (
          <div className="card border-l-4 border-l-warning p-5 lg:col-span-2">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="mb-2 font-bold text-bone">{t('aftermarket.maintenance.dueSoon')}</h2>
                <ul className="m-0 list-none divide-y divide-ink-4 p-0">
                  {duePlans.map((plan) => (
                    <li
                      key={plan.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-bone">{plan.title}</div>
                        <div className="truncate text-xs text-steel-2">
                          {plan.customer_assets?.title ?? plan.customer_assets?.asset_tag}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[0.6875rem] font-bold text-warning">
                        {plan.next_due_at
                          ? format(new Date(plan.next_due_at), 'dd MMM yyyy', { locale: dateLocale })
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {pendingParts.length > 0 && (
          <div className="card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold text-bone">
                <Box size={18} className="shrink-0" aria-hidden />
                {t('aftermarket.parts.pendingQuotes')}
              </h2>
              <Link href={`${basePath}/parts`} className="shrink-0 text-sm font-semibold text-arc-2 no-underline hover:underline">
                {t('aftermarket.viewAll')} →
              </Link>
            </div>
            <ul className="m-0 list-none divide-y divide-ink-4 p-0">
              {pendingParts.slice(0, 3).map((req) => (
                <li key={req.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-semibold text-bone">{req.request_number}</div>
                    <div className="text-xs text-steel-2">
                      {req.lines?.length ?? 0} {t('aftermarket.parts.lineItems')}
                    </div>
                  </div>
                  <AftermarketStatusBadge kind="parts" value={req.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
