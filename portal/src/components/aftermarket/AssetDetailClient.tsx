'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Box,
  CalendarClock,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  QrCode,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { getLocalizedStages } from '@/lib/i18n/helpers';
import { AftermarketNav } from '@/components/aftermarket/AftermarketNav';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { AdminAssetBomPanel } from '@/components/aftermarket/AdminAssetBomPanel';
import { AdminAssetWarrantyPanel } from '@/components/aftermarket/AdminAssetWarrantyPanel';
import {
  actionLinkPrimary,
  actionLinkSecondary,
  btnPrimary,
  detailGrid,
  listLink,
  metaBox,
  sectionCard,
  specLabel,
  specRow,
  specValue,
  statTile,
} from '@/components/aftermarket/ui';
import { isWarrantyActive, warrantyDaysRemaining } from '@/lib/aftermarket/warranty';
import type {
  AssetBomLine,
  CustomerAsset,
  MaintenancePlan,
  MaintenanceRecord,
  ServiceCase,
  SparePartCatalogItem,
  SparePartRequest,
} from '@/lib/portal/types-ext';

interface AssetDetailClientProps {
  asset: CustomerAsset;
  bom: AssetBomLine[];
  cases: ServiceCase[];
  maintenancePlans?: MaintenancePlan[];
  maintenanceRecords?: MaintenanceRecord[];
  partRequests?: SparePartRequest[];
  basePath?: string;
  isAdmin?: boolean;
  catalog?: SparePartCatalogItem[];
}

const OPEN_CASE_STATUSES = ['submitted', 'triage', 'assigned', 'in_progress', 'waiting_parts', 'resolved'];

function warrantyProgressPercent(asset: CustomerAsset): number | null {
  if (!asset.warranty_start || !asset.warranty_end) return null;
  const start = new Date(asset.warranty_start).getTime();
  const end = new Date(asset.warranty_end).getTime();
  const now = Date.now();
  if (end <= start) return null;
  const pct = ((now - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function AssetDetailClient({
  asset,
  bom,
  cases,
  maintenancePlans = [],
  maintenanceRecords = [],
  partRequests = [],
  basePath = '/aftermarket',
  isAdmin = false,
  catalog = [],
}: AssetDetailClientProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const stages = getLocalizedStages(t);
  const [location, setLocation] = useState(asset.location ?? '');
  const [saving, setSaving] = useState(false);

  const warrantyActive = isWarrantyActive(asset);
  const days = warrantyDaysRemaining(asset);
  const warrantyPct = warrantyProgressPercent(asset);
  const openCases = useMemo(() => cases.filter((c) => OPEN_CASE_STATUSES.includes(c.status)), [cases]);
  const duePlans = useMemo(
    () =>
      maintenancePlans.filter(
        (p) =>
          p.status === 'active' &&
          p.next_due_at &&
          new Date(p.next_due_at) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ),
    [maintenancePlans]
  );

  const order = asset.orders;
  const currentStage = order ? stages.find((s) => s.number === order.current_stage) : undefined;

  async function saveLocation() {
    if (!isAdmin) return;
    setSaving(true);
    await supabase.from('customer_assets').update({ location, updated_at: new Date().toISOString() }).eq('id', asset.id);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <AftermarketNav basePath={basePath} />

      <Link href={`${basePath}/assets`} className="inline-flex items-center gap-1 text-sm text-steel-2 hover:text-bone">
        <ChevronLeft size={16} className="shrink-0" aria-hidden />
        {t('aftermarket.backToAssets')}
      </Link>

      {/* Header */}
      <div className={sectionCard}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs text-steel-2">{asset.asset_tag}</div>
            <h1 className="mt-1 text-2xl font-black text-bone">{asset.title}</h1>
            {asset.serial_number && (
              <p className="mt-1 text-sm text-steel-2">
                {t('aftermarket.assets.serial')}: <span className="font-mono text-bone">{asset.serial_number}</span>
              </p>
            )}
            {asset.description && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-steel-2">{asset.description}</p>
            )}
          </div>
          <AftermarketStatusBadge kind="asset" value={asset.status} />
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className={statTile}>
            <span className="text-2xl font-black text-bone">{openCases.length}</span>
            <span className="text-xs text-steel-2">{t('aftermarket.assets.stats.openCases')}</span>
          </div>
          <div className={statTile}>
            <span className="text-2xl font-black text-bone">{duePlans.length}</span>
            <span className="text-xs text-steel-2">{t('aftermarket.assets.stats.maintenanceDue')}</span>
          </div>
          <div className={statTile}>
            <span className="text-2xl font-black text-bone">{partRequests.length}</span>
            <span className="text-xs text-steel-2">{t('aftermarket.assets.stats.partRequests')}</span>
          </div>
          <div className={statTile}>
            <span className="text-2xl font-black text-bone">{bom.length}</span>
            <span className="text-xs text-steel-2">{t('aftermarket.assets.stats.bomParts')}</span>
          </div>
        </div>

        {/* Warranty bar */}
        {asset.warranty_end && (
          <div className="mt-6 rounded-lg border border-ink-4 bg-ink-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="shrink-0 text-arc-2" aria-hidden />
                <span className="font-semibold text-bone">{t('aftermarket.assets.warranty')}</span>
              </div>
              <span className={`text-sm font-semibold ${warrantyActive ? 'text-success' : 'text-steel-2'}`}>
                {warrantyActive
                  ? t('aftermarket.assets.warrantyDays', { days: days ?? 0 })
                  : t('aftermarket.assets.warrantyExpired')}
              </span>
            </div>
            {warrantyPct != null && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-ink-4">
                  <div
                    className={`h-full rounded-full transition-all ${warrantyActive ? 'bg-success' : 'bg-steel-2'}`}
                    style={{ width: `${warrantyPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-steel-2">
                  {asset.warranty_start && (
                    <span>{format(new Date(asset.warranty_start), 'dd MMM yyyy', { locale: dateLocale })}</span>
                  )}
                  <span>{format(new Date(asset.warranty_end), 'dd MMM yyyy', { locale: dateLocale })}</span>
                </div>
              </div>
            )}
            {asset.warranty_months > 0 && (
              <p className="mt-2 text-xs text-steel-2">
                {t('aftermarket.assets.warrantyPeriod', { months: asset.warranty_months })}
              </p>
            )}
          </div>
        )}

        {isAdmin && <AdminAssetWarrantyPanel asset={asset} />}

        {/* Actions */}
        {!isAdmin && (
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Link href={`${basePath}/service?new=1&asset=${asset.id}`} className={actionLinkPrimary}>
              <Wrench size={16} className="shrink-0" aria-hidden />
              {t('aftermarket.assets.actions.service')}
            </Link>
            <Link href={`${basePath}/parts?new=1&asset=${asset.id}`} className={actionLinkSecondary}>
              <Box size={16} className="shrink-0" aria-hidden />
              {t('aftermarket.assets.actions.parts')}
            </Link>
            <Link href={`${basePath}/maintenance`} className={actionLinkSecondary}>
              <CalendarClock size={16} className="shrink-0" aria-hidden />
              {t('aftermarket.assets.actions.maintenance')}
            </Link>
            {order && (
              <Link
                href={isAdmin ? `/admin/orders/${order.id}` : `/orders/${order.id}`}
                className={actionLinkSecondary}
              >
                <FileText size={16} className="shrink-0" aria-hidden />
                {t('aftermarket.assets.viewOrder')}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Specs + order info */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={sectionCard}>
          <h2 className="mb-4 font-bold text-bone">{t('aftermarket.assets.technicalSpecs')}</h2>
          <div>
            {asset.material && (
              <div className={specRow}>
                <span className={specLabel}>{t('common.material')}</span>
                <span className={specValue}>{asset.material}</span>
              </div>
            )}
            {asset.standard && (
              <div className={specRow}>
                <span className={specLabel}>{t('common.standard')}</span>
                <span className={specValue}>{asset.standard}</span>
              </div>
            )}
            {asset.installed_at && (
              <div className={specRow}>
                <span className={specLabel}>{t('aftermarket.assets.installed')}</span>
                <span className={specValue}>
                  {format(new Date(asset.installed_at), 'dd MMM yyyy', { locale: dateLocale })}
                </span>
              </div>
            )}
            <div className={specRow}>
              <span className={specLabel}>{t('aftermarket.assets.location')}</span>
              {isAdmin ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <input className="input flex-1" value={location} onChange={(e) => setLocation(e.target.value)} />
                  <button type="button" className={`${btnPrimary} shrink-0`} disabled={saving} onClick={saveLocation}>
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              ) : (
                <span className={specValue}>{asset.location ?? '—'}</span>
              )}
            </div>
            {asset.notes && isAdmin && (
              <div className={specRow}>
                <span className={specLabel}>{t('aftermarket.assets.internalNotes')}</span>
                <span className={specValue}>{asset.notes}</span>
              </div>
            )}
          </div>
        </div>

        <div className={sectionCard}>
          <h2 className="mb-4 font-bold text-bone">{t('aftermarket.assets.orderInfo')}</h2>
          {order ? (
            <div>
              <div className={specRow}>
                <span className={specLabel}>{t('aftermarket.assets.jobNumber')}</span>
                <Link
                  href={isAdmin ? `/admin/orders/${order.id}` : `/orders/${order.id}`}
                  className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-arc-2 no-underline hover:underline"
                >
                  {order.job_number}
                  <ExternalLink size={14} className="shrink-0" aria-hidden />
                </Link>
              </div>
              {order.status && (
                <div className={specRow}>
                  <span className={specLabel}>{t('common.status')}</span>
                  <span className={specValue}>{t(`orderStatus.${order.status}`)}</span>
                </div>
              )}
              {currentStage && (
                <div className={specRow}>
                  <span className={specLabel}>{t('common.stage')}</span>
                  <span className={specValue}>
                    {order.current_stage}/7 — {currentStage.title}
                  </span>
                </div>
              )}
              {order.expected_delivery && (
                <div className={specRow}>
                  <span className={specLabel}>{t('aftermarket.assets.delivery')}</span>
                  <span className={specValue}>
                    {format(new Date(order.expected_delivery), 'dd MMM yyyy', { locale: dateLocale })}
                  </span>
                </div>
              )}
              {order.shipped_at && (
                <div className={specRow}>
                  <span className={specLabel}>{t('aftermarket.assets.shipped')}</span>
                  <span className={specValue}>
                    {format(new Date(order.shipped_at), 'dd MMM yyyy', { locale: dateLocale })}
                  </span>
                </div>
              )}
              {order.traceability_token && !isAdmin && (
                <div className={specRow}>
                  <span className={specLabel}>{t('aftermarket.assets.traceability')}</span>
                  <Link
                    href={`/trace/${order.traceability_token}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-arc-2 no-underline hover:underline"
                  >
                    <QrCode size={14} className="shrink-0" aria-hidden />
                    {t('aftermarket.assets.viewTraceability')}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-steel-2">{t('aftermarket.assets.noOrder')}</p>
          )}
        </div>
      </div>

      {/* KPI meta boxes (mobile-friendly) */}
      <div className={detailGrid}>
        <div className={metaBox}>
          <ShieldCheck size={18} className="shrink-0 text-arc-2" aria-hidden />
          <div className="min-w-0">
            <div className="label">{t('aftermarket.assets.warranty')}</div>
            <div className={`font-semibold ${warrantyActive ? 'text-success' : 'text-steel-2'}`}>
              {warrantyActive
                ? t('aftermarket.assets.warrantyDays', { days: days ?? 0 })
                : t('aftermarket.assets.warrantyExpired')}
            </div>
          </div>
        </div>
        {asset.material && (
          <div className={metaBox}>
            <Package size={18} className="shrink-0 text-arc-2" aria-hidden />
            <div className="min-w-0">
              <div className="label">{t('common.material')}</div>
              <div className="font-semibold text-bone">{asset.material}</div>
            </div>
          </div>
        )}
        {asset.standard && (
          <div className={metaBox}>
            <ClipboardList size={18} className="shrink-0 text-arc-2" aria-hidden />
            <div className="min-w-0">
              <div className="label">{t('common.standard')}</div>
              <div className="font-semibold text-bone">{asset.standard}</div>
            </div>
          </div>
        )}
        {asset.location && !isAdmin && (
          <div className={metaBox}>
            <MapPin size={18} className="shrink-0 text-arc-2" aria-hidden />
            <div className="min-w-0">
              <div className="label">{t('aftermarket.assets.location')}</div>
              <div className="font-semibold text-bone">{asset.location}</div>
            </div>
          </div>
        )}
      </div>

      {/* BOM */}
      <div className={`${sectionCard} overflow-visible`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-bone">{t('aftermarket.assets.bom')}</h2>
          {!isAdmin && bom.length > 0 && (
            <Link href={`${basePath}/parts?asset=${asset.id}`} className="text-sm font-semibold text-arc-2 no-underline hover:underline">
              {t('aftermarket.assets.orderParts')} →
            </Link>
          )}
        </div>
        {bom.length === 0 ? (
          <p className="text-sm text-steel-2">{t('aftermarket.assets.bomEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="orders-table w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-4 bg-ink-3">
                  <th className="table-head p-3 text-left">{t('aftermarket.parts.partNumber')}</th>
                  <th className="table-head p-3 text-left">{t('aftermarket.parts.partName')}</th>
                  <th className="table-head p-3 text-left">{t('aftermarket.parts.qty')}</th>
                  <th className="table-head p-3 text-left">{t('aftermarket.parts.stock')}</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((line) => (
                  <tr key={line.id} className="border-b border-ink-4">
                    <td className="p-3 font-mono text-arc-2">{line.spare_part_catalog?.part_number}</td>
                    <td className="p-3 text-bone">{line.spare_part_catalog?.name}</td>
                    <td className="p-3 text-steel-2">{line.qty}</td>
                    <td className="p-3">
                      {line.spare_part_catalog && (
                        <AftermarketStatusBadge kind="stock" value={line.spare_part_catalog.stock_status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isAdmin && catalog.length > 0 && (
          <AdminAssetBomPanel asset={asset} catalog={catalog} existingPartIds={bom.map((b) => b.part_id)} />
        )}
      </div>

      {/* Maintenance */}
      <div className={sectionCard}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-bone">{t('aftermarket.maintenance.activePlans')}</h2>
          <Link href={`${basePath}/maintenance`} className="text-sm font-semibold text-arc-2 no-underline hover:underline">
            {t('aftermarket.assets.viewMaintenance')} →
          </Link>
        </div>
        {maintenancePlans.length === 0 ? (
          <p className="text-sm text-steel-2">{t('aftermarket.assets.noMaintenance')}</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-ink-4 p-0">
            {maintenancePlans.map((plan) => (
              <li key={plan.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-bone">{plan.title}</div>
                  {plan.next_due_at && (
                    <div className="text-xs text-steel-2">
                      {t('aftermarket.maintenance.nextDue')}:{' '}
                      {format(new Date(plan.next_due_at), 'dd MMM yyyy', { locale: dateLocale })}
                    </div>
                  )}
                </div>
                <AftermarketStatusBadge kind="maintenance" value={plan.status} />
              </li>
            ))}
          </ul>
        )}
        {maintenanceRecords.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 font-semibold text-bone">{t('aftermarket.maintenance.history')}</h3>
            <ul className="m-0 list-none divide-y divide-ink-4 p-0">
              {maintenanceRecords.slice(0, 5).map((rec) => (
                <li key={rec.id} className="py-3">
                  <div className="font-medium text-bone">{rec.work_summary}</div>
                  <div className="text-xs text-steel-2">
                    {format(new Date(rec.performed_at), 'dd MMM yyyy', { locale: dateLocale })}
                    {rec.performed_by ? ` · ${rec.performed_by}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Part requests */}
      <div className={sectionCard}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-bone">{t('aftermarket.parts.myRequests')}</h2>
          {!isAdmin && (
            <Link href={`${basePath}/parts?new=1&asset=${asset.id}`} className="text-sm font-semibold text-arc-2 no-underline hover:underline">
              {t('aftermarket.assets.actions.parts')} →
            </Link>
          )}
        </div>
        {partRequests.length === 0 ? (
          <p className="text-sm text-steel-2">{t('aftermarket.assets.noPartRequests')}</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-ink-4 p-0">
            {partRequests.map((req) => (
              <li key={req.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-mono text-sm text-arc-2">{req.request_number}</div>
                  <div className="text-xs text-steel-2">
                    {format(new Date(req.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                    {req.lines?.length ? ` · ${req.lines.length} ${t('aftermarket.parts.lineItems')}` : ''}
                  </div>
                </div>
                <AftermarketStatusBadge kind="parts" value={req.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Service history */}
      <div className={sectionCard}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-bone">{t('aftermarket.service.history')}</h2>
          {!isAdmin && (
            <Link href={`${basePath}/service?new=1&asset=${asset.id}`} className="text-sm font-semibold text-arc-2 no-underline hover:underline">
              {t('aftermarket.assets.actions.service')} →
            </Link>
          )}
        </div>
        {cases.length === 0 ? (
          <p className="text-sm text-steel-2">{t('aftermarket.assets.noServiceCases')}</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-ink-4 p-0">
            {cases.map((c) => (
              <li key={c.id}>
                <Link href={`${basePath}/service/${c.id}`} className={listLink}>
                  <div className="min-w-0">
                    <div className="font-semibold text-bone">{c.case_number}</div>
                    <div className="truncate text-xs text-steel-2">{c.subject}</div>
                    <div className="text-xs text-steel-2">
                      {format(new Date(c.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                    </div>
                  </div>
                  <AftermarketStatusBadge kind="service" value={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
