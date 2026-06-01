'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, CalendarClock, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketNav } from '@/components/aftermarket/AftermarketNav';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { btnPrimary, btnSecondarySm, rowCard } from '@/components/aftermarket/ui';
import type { CustomerAsset, MaintenancePlan, MaintenanceRecord } from '@/lib/portal/types-ext';

interface MaintenancePageClientProps {
  customerId: string;
  assets: CustomerAsset[];
  plans: MaintenancePlan[];
  records: MaintenanceRecord[];
  basePath?: string;
  isAdmin?: boolean;
}

export function MaintenancePageClient({
  customerId,
  assets,
  plans,
  records,
  basePath = '/aftermarket',
  isAdmin = false,
}: MaintenancePageClientProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planAssetId, setPlanAssetId] = useState(assets[0]?.id ?? '');
  const [planTitle, setPlanTitle] = useState('');
  const [planInterval, setPlanInterval] = useState('180');
  const [planDescription, setPlanDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const duePlans = plans.filter(
    (p) =>
      p.status === 'active' &&
      p.next_due_at &&
      new Date(p.next_due_at) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !planAssetId || !planTitle.trim()) return;
    const asset = assets.find((a) => a.id === planAssetId);
    if (!asset) return;
    setSaving(true);
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + Number(planInterval));
    await supabase.from('maintenance_plans').insert({
      customer_id: asset.customer_id,
      asset_id: planAssetId,
      title: planTitle.trim(),
      description: planDescription.trim() || null,
      interval_days: Number(planInterval),
      next_due_at: nextDue.toISOString().slice(0, 10),
      checklist: [],
    });
    setSaving(false);
    setShowPlanForm(false);
    setPlanTitle('');
    router.refresh();
  }

  async function logMaintenance(plan: MaintenancePlan) {
    if (!isAdmin) return;
    setSaving(true);
    const performedAt = new Date();
    const nextDue = new Date(performedAt);
    nextDue.setDate(nextDue.getDate() + plan.interval_days);

    await supabase.from('maintenance_records').insert({
      customer_id: plan.customer_id,
      asset_id: plan.asset_id,
      plan_id: plan.id,
      performed_by: 'ArmaWeld',
      work_summary: t('aftermarket.maintenance.defaultSummary', { title: plan.title }),
      next_due_at: nextDue.toISOString().slice(0, 10),
    });

    await supabase
      .from('maintenance_plans')
      .update({
        last_performed_at: performedAt.toISOString().slice(0, 10),
        next_due_at: nextDue.toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id);

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <AftermarketNav basePath={basePath} />

      {duePlans.length > 0 && (
        <div className="card flex items-start gap-3 border-l-4 border-l-warning p-4">
          <AlertTriangle size={20} className="shrink-0 text-warning" aria-hidden />
          <div>
            <div className="font-bold text-bone">{t('aftermarket.maintenance.dueSoon')}</div>
            <p className="text-sm text-steel-2">{t('aftermarket.maintenance.dueSoonDesc', { count: duePlans.length })}</p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-end">
          <button type="button" className={btnPrimary} onClick={() => setShowPlanForm(!showPlanForm)}>
            <Plus size={16} className="shrink-0" aria-hidden />
            {t('aftermarket.maintenance.newPlan')}
          </button>
        </div>
      )}

      {showPlanForm && isAdmin && (
        <form onSubmit={createPlan} className="card space-y-4 p-6">
          <h2 className="font-bold text-bone">{t('aftermarket.maintenance.newPlan')}</h2>
          <div>
            <label className="label">{t('aftermarket.service.asset')}</label>
            <select className="input" value={planAssetId} onChange={(e) => setPlanAssetId(e.target.value)} required>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.asset_tag} — {a.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('aftermarket.maintenance.planTitle')}</label>
            <input className="input" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t('aftermarket.maintenance.intervalDays')}</label>
            <input className="input" type="number" min={7} value={planInterval} onChange={(e) => setPlanInterval(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('aftermarket.maintenance.description')}</label>
            <textarea className="input" value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} />
          </div>
          <button type="submit" className={btnPrimary} disabled={saving}>{t('common.save')}</button>
        </form>
      )}

      <div className="card p-6">
        <h2 className="mb-4 font-bold text-bone">{t('aftermarket.maintenance.activePlans')}</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-steel-2">{t('aftermarket.maintenance.noPlans')}</p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className={rowCard}>
                <div className="min-w-0">
                  <div className="font-semibold text-bone">{plan.title}</div>
                  <div className="text-xs text-steel-2">
                    {plan.customer_assets?.title ?? plan.customer_assets?.asset_tag}
                    {plan.next_due_at && (
                      <> · {t('aftermarket.maintenance.nextDue')}: {format(new Date(plan.next_due_at), 'dd MMM yyyy', { locale: dateLocale })}</>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AftermarketStatusBadge kind="maintenance" value={plan.status} />
                  {isAdmin && plan.status === 'active' && (
                    <button type="button" className={btnSecondarySm} disabled={saving} onClick={() => logMaintenance(plan)}>
                      {t('aftermarket.maintenance.markDone')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-bone">
          <CalendarClock size={18} className="shrink-0" aria-hidden />
          {t('aftermarket.maintenance.history')}
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-steel-2">{t('aftermarket.maintenance.noRecords')}</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-ink-4 p-0">
            {records.map((rec) => (
              <li key={rec.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-bone">{rec.work_summary}</div>
                  <div className="text-xs text-steel-2">
                    {rec.customer_assets?.title}
                    {rec.performed_by ? ` · ${rec.performed_by}` : ''}
                  </div>
                </div>
                <span className="text-xs text-steel-2">
                  {format(new Date(rec.performed_at), 'dd MMM yyyy', { locale: dateLocale })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
