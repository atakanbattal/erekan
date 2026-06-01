'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { btnPrimary } from '@/components/portal/ui';
import { computeWarrantyEndFromDays } from '@/lib/aftermarket/warranty';
import type { Order } from '@/lib/types';

interface OrderWarrantyPanelProps {
  order: Pick<Order, 'id' | 'warranty_days' | 'shipped_at' | 'status'>;
}

const PRESET_DAYS = [365, 730, 1095, 1825];

export function OrderWarrantyPanel({ order }: OrderWarrantyPanelProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [warrantyDays, setWarrantyDays] = useState(String(order.warranty_days ?? 730));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const previewEnd = useMemo(() => {
    const days = Number(warrantyDays);
    if (!order.shipped_at || !Number.isFinite(days) || days < 1) return null;
    return computeWarrantyEndFromDays(order.shipped_at.slice(0, 10), days);
  }, [order.shipped_at, warrantyDays]);

  async function saveWarranty(e: React.FormEvent) {
    e.preventDefault();
    const days = Number(warrantyDays);
    if (!Number.isFinite(days) || days < 1) {
      setError(t('admin.orderWarranty.invalid'));
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ warranty_days: days, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  const shipped = Boolean(order.shipped_at);

  return (
    <form onSubmit={saveWarranty} className="card p-5">
      <div className="mb-4 flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-arc-2" aria-hidden />
        <div>
          <h3 className="font-bold text-bone">{t('admin.orderWarranty.title')}</h3>
          <p className="mt-1 text-sm text-steel-2">{t('admin.orderWarranty.desc')}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESET_DAYS.map((days) => (
          <button
            key={days}
            type="button"
            className={[
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              Number(warrantyDays) === days
                ? 'border-arc-2 bg-arc-2/10 text-arc-2'
                : 'border-ink-4 bg-ink-1 text-steel-2 hover:border-ink-5',
            ].join(' ')}
            onClick={() => setWarrantyDays(String(days))}
          >
            {t('admin.orderWarranty.preset', { days })}
          </button>
        ))}
      </div>

      <div className="max-w-xs">
        <label className="label">{t('admin.orderWarranty.days')}</label>
        <input
          type="number"
          min={1}
          max={3650}
          className="input w-full"
          value={warrantyDays}
          onChange={(e) => {
            setWarrantyDays(e.target.value);
            setSaved(false);
          }}
          required
        />
        <p className="mt-1 text-xs text-steel-2">{t('admin.orderWarranty.daysHint')}</p>
      </div>

      <div className="mt-4 rounded-md border border-ink-4 bg-ink-1 px-3 py-2 text-sm">
        {shipped ? (
          <>
            <span className="text-steel-2">{t('admin.orderWarranty.startLabel')}: </span>
            <span className="font-semibold text-bone">
              {format(new Date(order.shipped_at!), 'd MMM yyyy', { locale: dateLocale })}
            </span>
            {previewEnd && (
              <>
                <span className="mx-2 text-steel-2">→</span>
                <span className="text-steel-2">{t('admin.orderWarranty.endLabel')}: </span>
                <span className="font-semibold text-success">{previewEnd}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-steel-2">{t('admin.orderWarranty.startsOnShip')}</span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {saved && <p className="mt-3 text-sm text-success">{t('admin.orderWarranty.saved')}</p>}

      <button type="submit" className={`${btnPrimary} mt-4`} disabled={saving}>
        {saving ? t('common.saving') : t('admin.orderWarranty.save')}
      </button>
    </form>
  );
}
