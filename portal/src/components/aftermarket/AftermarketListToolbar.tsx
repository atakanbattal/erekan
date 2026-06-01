'use client';

import { Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { filterTabClass } from '@/components/aftermarket/ui';

interface FilterOption {
  id: string;
  label: string;
}

interface AftermarketListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  count: number;
  total: number;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (id: string) => void;
  secondaryFilters?: FilterOption[];
  activeSecondaryFilter?: string;
  onSecondaryFilterChange?: (id: string) => void;
  children?: React.ReactNode;
}

export function AftermarketListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  count,
  total,
  filters,
  activeFilter,
  onFilterChange,
  secondaryFilters,
  activeSecondaryFilter,
  onSecondaryFilterChange,
  children,
}: AftermarketListToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="orders-search min-w-[220px] flex-1 max-w-md">
          <Search size={16} className="orders-search-icon" aria-hidden />
          <input
            type="search"
            className="input orders-search-input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <span className="text-sm text-steel-2">
          {t('aftermarket.list.showing', { count, total })}
        </span>
        {children}
      </div>

      {(filters?.length || secondaryFilters?.length) && (
        <div className="flex flex-wrap gap-2">
          {filters?.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filterTabClass(activeFilter === f.id)}
              onClick={() => onFilterChange?.(f.id)}
            >
              {f.label}
            </button>
          ))}
          {secondaryFilters?.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filterTabClass(activeSecondaryFilter === f.id)}
              onClick={() => onSecondaryFilterChange?.(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
