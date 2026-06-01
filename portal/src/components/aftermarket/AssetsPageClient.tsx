'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketNav } from '@/components/aftermarket/AftermarketNav';
import { AftermarketListToolbar } from '@/components/aftermarket/AftermarketListToolbar';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { isWarrantyActive, warrantyDaysRemaining } from '@/lib/aftermarket/warranty';
import type { CustomerAsset } from '@/lib/portal/types-ext';

interface AssetsPageClientProps {
  assets: CustomerAsset[];
  basePath?: string;
  isAdmin?: boolean;
}

type StatusFilter = 'all' | 'active' | 'under_service' | 'retired';
type WarrantyFilter = 'all' | 'active' | 'expired';

export function AssetsPageClient({
  assets,
  basePath = '/aftermarket',
  isAdmin = false,
}: AssetsPageClientProps) {
  const { t, dateLocale } = useI18n();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [warrantyFilter, setWarrantyFilter] = useState<WarrantyFilter>('all');

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: t('aftermarket.assets.filter.all') },
    { id: 'active', label: t('aftermarket.assetStatus.active') },
    { id: 'under_service', label: t('aftermarket.assetStatus.under_service') },
    { id: 'retired', label: t('aftermarket.assetStatus.retired') },
  ];

  const warrantyFilters: { id: WarrantyFilter; label: string }[] = [
    { id: 'all', label: t('aftermarket.assets.filter.warrantyAll') },
    { id: 'active', label: t('aftermarket.assets.filter.warrantyActive') },
    { id: 'expired', label: t('aftermarket.assets.filter.warrantyExpired') },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
      const warrantyActive = isWarrantyActive(asset);
      if (warrantyFilter === 'active' && !warrantyActive) return false;
      if (warrantyFilter === 'expired' && warrantyActive) return false;
      if (!q) return true;
      const haystack = [
        asset.asset_tag,
        asset.title,
        asset.description,
        asset.serial_number,
        asset.location,
        asset.material,
        asset.standard,
        asset.orders?.job_number,
        isAdmin ? asset.customers?.company_name : null,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [assets, search, statusFilter, warrantyFilter, isAdmin]);

  return (
    <div className="flex flex-col gap-5">
      <AftermarketNav basePath={basePath} />

      {assets.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-steel-2">{t('aftermarket.assets.empty')}</p>
          <p className="mt-2 text-sm text-steel-2">{t('aftermarket.assets.emptyHint')}</p>
        </div>
      ) : (
        <>
          <AftermarketListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('aftermarket.assets.search')}
            count={filtered.length}
            total={assets.length}
            filters={statusFilters}
            activeFilter={statusFilter}
            onFilterChange={(id) => setStatusFilter(id as StatusFilter)}
            secondaryFilters={warrantyFilters}
            activeSecondaryFilter={warrantyFilter}
            onSecondaryFilterChange={(id) => setWarrantyFilter(id as WarrantyFilter)}
          />

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="orders-table w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink-4 bg-ink-3">
                    <th className="table-head p-4 text-left">{t('aftermarket.assets.tag')}</th>
                    <th className="table-head p-4 text-left">{t('aftermarket.assets.product')}</th>
                    {isAdmin && (
                      <th className="table-head hidden p-4 text-left md:table-cell">{t('aftermarket.assets.customer')}</th>
                    )}
                    <th className="table-head hidden p-4 text-left sm:table-cell">{t('aftermarket.assets.serial')}</th>
                    <th className="table-head hidden p-4 text-left lg:table-cell">{t('aftermarket.assets.location')}</th>
                    <th className="table-head hidden p-4 text-left md:table-cell">{t('common.status')}</th>
                    <th className="table-head hidden p-4 text-left lg:table-cell">{t('aftermarket.assets.warranty')}</th>
                    <th className="table-head hidden p-4 text-left xl:table-cell">{t('aftermarket.assets.installed')}</th>
                    <th className="table-head p-4 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-steel-2">
                        {t('aftermarket.list.noResults')}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((asset) => {
                      const warrantyActive = isWarrantyActive(asset);
                      const days = warrantyDaysRemaining(asset);
                      return (
                        <tr
                          key={asset.id}
                          className="border-b border-ink-4 transition-colors hover:bg-ink-3/30"
                        >
                          <td className="p-4 font-mono text-arc-2">{asset.asset_tag}</td>
                          <td className="p-4">
                            <div className="font-medium text-bone">{asset.title}</div>
                            {asset.description && (
                              <div className="mt-0.5 line-clamp-2 text-xs text-steel-2">{asset.description}</div>
                            )}
                            {(asset.material || asset.standard || asset.orders?.job_number) && (
                              <div className="mt-0.5 text-xs text-steel-2">
                                {[
                                  asset.orders?.job_number,
                                  asset.material,
                                  asset.standard,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            )}
                            <div className="mt-2 md:hidden">
                              <AftermarketStatusBadge kind="asset" value={asset.status} />
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="hidden p-4 text-steel-2 md:table-cell">
                              {asset.customers?.company_name ?? '—'}
                            </td>
                          )}
                          <td className="hidden p-4 font-mono text-steel-2 sm:table-cell">
                            {asset.serial_number ?? '—'}
                          </td>
                          <td className="hidden max-w-[180px] truncate p-4 text-steel-2 lg:table-cell">
                            {asset.location ?? '—'}
                          </td>
                          <td className="hidden p-4 md:table-cell">
                            <AftermarketStatusBadge kind="asset" value={asset.status} />
                          </td>
                          <td className="hidden p-4 lg:table-cell">
                            <span className={warrantyActive ? 'text-success' : 'text-steel-2'}>
                              {warrantyActive
                                ? t('aftermarket.assets.warrantyDays', { days: days ?? 0 })
                                : t('aftermarket.assets.warrantyExpired')}
                            </span>
                          </td>
                          <td className="hidden p-4 text-steel-2 xl:table-cell">
                            {asset.installed_at
                              ? format(new Date(asset.installed_at), 'dd MMM yyyy', { locale: dateLocale })
                              : '—'}
                          </td>
                          <td className="p-4">
                            <Link
                              href={`${basePath}/assets/${asset.id}`}
                              className="inline-flex items-center gap-1 text-sm text-arc-2 hover:underline"
                            >
                              {t('common.detail')} <ArrowRight size={14} className="shrink-0" aria-hidden />
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
        </>
      )}
    </div>
  );
}
