'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { isOrderOverdue } from '@/lib/portal/order-list-filters';
import type { Order } from '@/lib/types';

interface OrderDelayReasonPanelProps {
  order: Order;
  staffName: string;
}

export function OrderDelayReasonPanel({ order, staffName }: OrderDelayReasonPanelProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [reason, setReason] = useState(order.delay_reason ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const overdue = isOrderOverdue(order);

  if (!overdue && !order.delay_reason) return null;

  async function saveReason() {
    setSaving(true);
    setSaved(false);
    const trimmed = reason.trim();
    const supabase = createClient();

    await supabase
      .from('orders')
      .update({ delay_reason: trimmed || null })
      .eq('id', order.id);

    if (trimmed !== (order.delay_reason ?? '')) {
      await supabase.from('order_activity').insert({
        order_id: order.id,
        action: 'delay_reason_updated',
        description: trimmed
          ? t('admin.delayReason.activitySaved')
          : t('admin.delayReason.activityCleared'),
        actor_name: staffName,
      });
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="card p-5 border-l-4 border-l-danger">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-danger" />
        </div>
        <div>
          <h2 className="font-bold text-bone">{t('admin.delayReason.title')}</h2>
          <p className="text-sm text-steel-2 mt-1">{t('admin.delayReason.desc')}</p>
        </div>
      </div>

      <label className="label" htmlFor="delay-reason">
        {t('admin.delayReason.label')}
      </label>
      <textarea
        id="delay-reason"
        className="input min-h-[120px] resize-y"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setSaved(false);
        }}
        placeholder={t('admin.delayReason.placeholder')}
      />

      <div className="flex items-center gap-3 mt-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={saveReason}>
          {saving ? t('admin.delayReason.saving') : t('admin.delayReason.save')}
        </button>
        {saved && <span className="text-sm text-success">{t('admin.delayReason.saved')}</span>}
      </div>
    </section>
  );
}
