'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { btnPrimary } from '@/components/aftermarket/ui';
import {
  computeWarrantyEnd,
  isWarrantyActive,
  warrantyDaysRemaining,
} from '@/lib/aftermarket/warranty';
import type { CustomerAsset } from '@/lib/portal/types-ext';

interface AdminAssetWarrantyPanelProps {
  asset: CustomerAsset;
}

const PRESET_MONTHS = [12, 24, 36, 60];

function defaultStart(asset: CustomerAsset) {
  if (asset.warranty_start) return asset.warranty_start.slice(0, 10);
  if (asset.installed_at) return asset.installed_at.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export function AdminAssetWarrantyPanel({ asset }: AdminAssetWarrantyPanelProps) {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [warrantyStart, setWarrantyStart] = useState(defaultStart(asset));
  const [warrantyMonths, setWarrantyMonths] = useState(String(asset.warranty_months || 24));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewEnd = useMemo(() => {
    const months = Number(warrantyMonths);
    if (!warrantyStart || !Number.isFinite(months) || months < 1) return null;
    return computeWarrantyEnd(warrantyStart, months);
  }, [warrantyStart, warrantyMonths]);

  const previewDays = useMemo(() => {
    if (!previewEnd) return null;
    return warrantyDaysRemaining({ warranty_end: previewEnd });
  }, [previewEnd]);

  async function saveWarranty(e: React.FormEvent) {
    e.preventDefault();
    const months = Number(warrantyMonths);
    if (!warrantyStart || !Number.isFinite(months) || months < 1) {
      setError(t('aftermarket.admin.warrantyInvalid'));
      return;
    }

    setSaving(true);
    setError('');
    const warrantyEnd = computeWarrantyEnd(warrantyStart, months);

    const { error: updateError } = await supabase
      .from('customer_assets')
      .update({
        warranty_start: warrantyStart,
        warranty_end: warrantyEnd,
        warranty_months: months,
        updated_at: new Date().toISOString(),
      })
      .eq('id', asset.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  const currentlyActive = isWarrantyActive(asset);

  return (
    <form onSubmit={saveWarranty} className="mt-6 rounded-lg border border-ink-4 bg-ink-2/60 p-5">
      <div className="mb-4 flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-arc-2" aria-hidden />
        <div>
          <h3 className="font-bold text-bone">{t('aftermarket.admin.warrantyTitle')}</h3>
          <p className="mt-1 text-sm text-steel-2">{t('aftermarket.admin.warrantyDesc')}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESET_MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            className={[
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              Number(warrantyMonths) === m
                ? 'border-arc-2 bg-arc-2/10 text-arc-2'
                : 'border-ink-4 bg-ink-0 text-steel-2 hover:border-ink-5',
            ].join(' ')}
            onClick={() => setWarrantyMonths(String(m))}
          >
            {t('aftermarket.admin.warrantyPreset', { months: m })}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">{t('aftermarket.admin.warrantyStart')}</label>
          <input
            type="date"
            className="input w-full"
            value={warrantyStart}
            onChange={(e) => setWarrantyStart(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">{t('aftermarket.admin.warrantyMonths')}</label>
          <input
            type="number"
            min={1}
            max={120}
            className="input w-full"
            value={warrantyMonths}
            onChange={(e) => setWarrantyMonths(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-steel-2">{t('aftermarket.admin.warrantyMonthsHint')}</p>
        </div>
      </div>

      {previewEnd && (
        <div className="mt-4 rounded-md border border-ink-4 bg-ink-0 px-3 py-2 text-sm">
          <span className="text-steel-2">{t('aftermarket.admin.warrantyPreview')}: </span>
          <span className="font-semibold text-bone">{previewEnd}</span>
          {previewDays != null && (
            <span className={`ml-2 ${previewDays > 0 ? 'text-success' : 'text-steel-2'}`}>
              ({t('aftermarket.assets.warrantyDays', { days: Math.max(0, previewDays) })})
            </span>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-steel-2">
        {t('aftermarket.admin.warrantyCurrent')}:{' '}
        <span className={currentlyActive ? 'text-success' : 'text-steel-2'}>
          {currentlyActive
            ? t('aftermarket.assets.warrantyDays', { days: warrantyDaysRemaining(asset) ?? 0 })
            : t('aftermarket.assets.warrantyExpired')}
        </span>
        {asset.warranty_end && (
          <> · {t('aftermarket.admin.warrantyEndLabel')}: {asset.warranty_end.slice(0, 10)}</>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button type="submit" className={`${btnPrimary} mt-4`} disabled={saving}>
        {saving ? t('common.saving') : t('aftermarket.admin.saveWarranty')}
      </button>
    </form>
  );
}
