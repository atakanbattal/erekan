'use client';

import Link from 'next/link';
import { format, parse } from 'date-fns';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers,
  Package,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { getOrderStatusLabel } from '@/lib/i18n/helpers';
import { buildOrdersListHref } from '@/lib/portal/order-list-filters';
import type { PerformanceReport } from '@/lib/portal/performance-report';
import type { KpiTone } from '@/components/admin/AdminKpiGrid';

interface PerformanceReportPanelProps {
  report: PerformanceReport;
}

export function PerformanceReportPanel({ report }: PerformanceReportPanelProps) {
  const { t, dateLocale } = useI18n();

  const cards: {
    icon: typeof Layers;
    tone: KpiTone;
    label: string;
    value: string;
    hint: string;
    href?: string;
  }[] = [
    {
      icon: Layers,
      tone: 'purple',
      label: t('reports.totalOrders'),
      value: String(report.totalOrders),
      hint: t('reports.totalOrdersHint'),
      href: '/orders',
    },
    {
      icon: Package,
      tone: 'blue',
      label: t('reports.activeOrders'),
      value: String(report.activeOrders),
      hint: t('reports.activeOrdersHint'),
      href: buildOrdersListHref({ status: 'active', basePath: '/orders' }),
    },
    {
      icon: CheckCircle2,
      tone: 'green',
      label: t('reports.onTimeRate'),
      value: report.onTimeRate != null ? `%${report.onTimeRate}` : t('dashboard.noDataYet'),
      hint:
        report.finishedWithDate > 0
          ? t('dashboard.onTimeHint', {
              onTime: report.onTimeCount,
              total: report.finishedWithDate,
            })
          : t('reports.onTimeHintEmpty'),
      href: buildOrdersListHref({ filter: 'finished', basePath: '/orders' }),
    },
    {
      icon: CalendarClock,
      tone: 'amber',
      label: t('reports.overdue'),
      value: String(report.overdueCount),
      hint: t('reports.overdueHint'),
      href: buildOrdersListHref({ filter: 'overdue', basePath: '/orders' }),
    },
    {
      icon: TrendingUp,
      tone: 'blue',
      label: t('reports.avgProgress'),
      value: `%${report.avgStageProgress}`,
      hint: t('dashboard.avgProductionHint', { count: report.activeOrders }),
      href: buildOrdersListHref({ status: 'active', basePath: '/orders' }),
    },
    {
      icon: Clock3,
      tone: 'purple',
      label: t('reports.avgLeadTime'),
      value:
        report.avgLeadTimeDays != null
          ? `${report.avgLeadTimeDays} ${t('reports.days')}`
          : t('dashboard.noDataYet'),
      hint:
        report.leadTimeSampleCount > 0
          ? t('reports.leadTimeHint', { count: report.leadTimeSampleCount })
          : t('reports.leadTimeHintEmpty'),
    },
  ];

  const statusOrder = ['active', 'on_hold', 'shipped', 'completed', 'draft', 'cancelled'] as const;

  function formatMonth(monthKey: string) {
    try {
      const date = parse(monthKey, 'yyyy-MM', new Date());
      return format(date, 'MMM yyyy', { locale: dateLocale });
    } catch {
      return monthKey;
    }
  }

  if (report.totalOrders === 0) {
    return (
      <div className="card p-12 text-center">
        <BarChart3 size={32} className="mx-auto mb-3 text-steel-2" />
        <p className="text-steel-2">{t('reports.empty')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="report-kpi-grid">
        {cards.map(({ icon: Icon, tone, label, value, hint, href }) => {
          const inner = (
            <>
              <div className="admin-kpi-top">
                <span className="admin-kpi-icon">
                  <Icon size={18} aria-hidden />
                </span>
              </div>
              <div className="admin-kpi-value">{value}</div>
              <div className="admin-kpi-label">{label}</div>
              <div className="admin-kpi-hint">{hint}</div>
            </>
          );

          if (!href) {
            return (
              <div key={label} className={`admin-kpi-card admin-kpi-card--${tone}`}>
                {inner}
              </div>
            );
          }

          return (
            <Link key={label} href={href} className={`admin-kpi-card admin-kpi-card--${tone}`}>
              {inner}
            </Link>
          );
        })}
      </div>

      {Object.keys(report.byStatus).length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-ink-4 bg-ink-0 p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-bone">{t('reports.statusBreakdown')}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {statusOrder.map((status) => {
              const count = report.byStatus[status] ?? 0;
              if (count === 0) return null;
              return (
                <Link
                  key={status}
                  href={buildOrdersListHref({ status, basePath: '/orders' })}
                  className="rounded-xl border border-ink-4 bg-ink-1 px-3 py-2.5 text-center no-underline transition-colors hover:bg-ink-2"
                >
                  <div className="text-xl font-black text-bone">{count}</div>
                  <div className="mt-0.5 text-xs text-steel-2">{getOrderStatusLabel(t, status)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {report.monthlyDeliveries.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-ink-4 bg-ink-0 p-5 shadow-sm">
          <h3 className="mb-1 font-bold text-bone">{t('reports.monthlyDeliveries')}</h3>
          <p className="mb-4 text-sm text-steel-2">{t('reports.monthlyDeliveriesDesc')}</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-4 bg-ink-2">
                  <th className="table-head p-3 text-left">{t('reports.month')}</th>
                  <th className="table-head p-3 text-left">{t('reports.delivered')}</th>
                  <th className="table-head p-3 text-left">{t('reports.onTime')}</th>
                  <th className="table-head hidden p-3 text-left sm:table-cell">{t('reports.onTimeRate')}</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlyDeliveries.map((row) => {
                  const rate = row.count > 0 ? Math.round((row.onTime / row.count) * 100) : null;
                  return (
                    <tr key={row.month} className="border-b border-ink-4">
                      <td className="p-3 font-medium text-bone">{formatMonth(row.month)}</td>
                      <td className="p-3 text-steel-2">{row.count}</td>
                      <td className="p-3 text-steel-2">{row.onTime}</td>
                      <td className="hidden p-3 text-steel-2 sm:table-cell">
                        {rate != null ? `%${rate}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-ink-4 bg-ink-0 p-8 text-center text-sm text-steel-2">
          {t('reports.noMonthlyData')}
        </div>
      )}
    </div>
  );
}
