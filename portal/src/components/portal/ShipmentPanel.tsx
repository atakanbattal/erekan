'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Truck, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { Shipment } from '@/lib/portal/types-ext';
import type { OrderStatus } from '@/lib/stages';

interface ShipmentPanelProps {
  shipments: Shipment[];
  mode: 'admin' | 'customer';
  orderId: string;
  orderStatus?: OrderStatus;
  orderShippedAt?: string | null;
  staffName?: string;
  customerName?: string;
}

const emptyForm = {
  carrier: '',
  tracking_number: '',
  shipped_at: '',
  estimated_arrival: '',
  notes: '',
  asn_number: '',
  package_count: '',
  total_weight_kg: '',
};

export function ShipmentPanel({
  shipments,
  mode,
  orderId,
  orderStatus,
  orderShippedAt,
  staffName,
  customerName,
}: ShipmentPanelProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sortedShipments = [...shipments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  function startEdit(shipment: Shipment) {
    setEditingId(shipment.id);
    setForm({
      carrier: shipment.carrier ?? '',
      tracking_number: shipment.tracking_number ?? '',
      shipped_at: shipment.shipped_at ? shipment.shipped_at.slice(0, 10) : '',
      estimated_arrival: shipment.estimated_arrival
        ? shipment.estimated_arrival.slice(0, 10)
        : '',
      notes: shipment.notes ?? '',
      asn_number: shipment.asn_number ?? '',
      package_count: shipment.package_count != null ? String(shipment.package_count) : '',
      total_weight_kg: shipment.total_weight_kg != null ? String(shipment.total_weight_kg) : '',
    });
    setShowForm(true);
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode !== 'admin' || !staffName) return;

    setSaving(true);
    setError('');

    const payload = {
      order_id: orderId,
      carrier: form.carrier.trim() || null,
      tracking_number: form.tracking_number.trim() || null,
      shipped_at: form.shipped_at ? new Date(form.shipped_at).toISOString() : null,
      estimated_arrival: form.estimated_arrival
        ? new Date(form.estimated_arrival).toISOString()
        : null,
      notes: form.notes.trim() || null,
      asn_number: form.asn_number.trim() || null,
      package_count: form.package_count ? Number(form.package_count) : null,
      total_weight_kg: form.total_weight_kg ? Number(form.total_weight_kg) : null,
    };

    const { error: saveError } = editingId
      ? await supabase.from('shipments').update(payload).eq('id', editingId)
      : await supabase.from('shipments').insert(payload);

    if (saveError) {
      setError(t('shipmentPanel.saveError', { message: saveError.message }));
      setSaving(false);
      return;
    }

    if (payload.shipped_at) {
      const orderUpdate: { shipped_at: string; status?: OrderStatus; updated_at: string } = {
        shipped_at: payload.shipped_at,
        updated_at: new Date().toISOString(),
      };
      if (!orderShippedAt) {
        if (orderStatus === 'active' || orderStatus === 'draft') {
          orderUpdate.status = 'shipped';
        }
        await supabase.from('orders').update(orderUpdate).eq('id', orderId);
      } else if (orderStatus === 'active') {
        await supabase
          .from('orders')
          .update({ status: 'shipped', updated_at: new Date().toISOString() })
          .eq('id', orderId);
      }
    }

    if (!editingId) {
      await supabase.from('order_activity').insert({
        order_id: orderId,
        action: 'shipment_updated',
        description: `Sevkiyat kaydı eklendi — ${form.asn_number || form.carrier || form.tracking_number || '—'}`,
        actor_name: staffName,
      });
      void fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shipment_updated',
          orderId,
          title: `Sevkiyat güncellendi`,
        }),
      });
    }

    setSaving(false);
    resetForm();
    router.refresh();
  }

  async function confirmDelivery(shipmentId: string) {
    if (!customerName) return;
    setSaving(true);
    const res = await fetch(`/api/shipments/${shipmentId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedBy: customerName }),
    });
    setSaving(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-arc-2" />
          <h3 className="font-bold text-bone">{t('shipmentPanel.title')}</h3>
        </div>
        {mode === 'admin' && !showForm && (
          <button
            type="button"
            className="btn-secondary text-sm flex items-center gap-1.5"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm(emptyForm);
            }}
          >
            <Plus size={14} />
            {t('shipmentPanel.addShipment')}
          </button>
        )}
      </div>

      {mode === 'admin' && showForm && (
        <form onSubmit={handleSubmit} className="rounded border border-ink-4 bg-ink-1 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t('shipmentPanel.carrier')}</label>
              <input
                className="input"
                value={form.carrier}
                onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('shipmentPanel.trackingNumber')}</label>
              <input
                className="input font-mono text-sm"
                value={form.tracking_number}
                onChange={(e) => setForm((f) => ({ ...f, tracking_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('shipmentPanel.shippedAt')}</label>
              <input
                type="date"
                className="input"
                value={form.shipped_at}
                onChange={(e) => setForm((f) => ({ ...f, shipped_at: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('shipmentPanel.estimatedArrival')}</label>
              <input
                type="date"
                className="input"
                value={form.estimated_arrival}
                onChange={(e) => setForm((f) => ({ ...f, estimated_arrival: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('shipmentPanel.asnNumber')}</label>
              <input
                className="input font-mono text-sm"
                value={form.asn_number}
                onChange={(e) => setForm((f) => ({ ...f, asn_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('shipmentPanel.packageCount')}</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.package_count}
                onChange={(e) => setForm((f) => ({ ...f, package_count: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('shipmentPanel.totalWeight')}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={form.total_weight_kg}
                onChange={(e) => setForm((f) => ({ ...f, total_weight_kg: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">{t('shipmentPanel.notes')}</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? t('common.saving') : t('shipmentPanel.saveShipment')}
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={resetForm}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {sortedShipments.length === 0 ? (
        <p className="text-sm text-steel-2 text-center py-4">{t('shipmentPanel.empty')}</p>
      ) : (
        <div className="space-y-3">
          {sortedShipments.map((shipment) => (
            <div
              key={shipment.id}
              className="rounded border border-ink-4 bg-ink-1 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div>
                <div className="label">{t('shipmentPanel.carrier')}</div>
                <div className="text-sm text-bone">{shipment.carrier ?? '—'}</div>
              </div>
              <div>
                <div className="label">{t('shipmentPanel.trackingNumber')}</div>
                <div className="text-sm font-mono text-arc-2">
                  {shipment.tracking_number ?? '—'}
                </div>
              </div>
              {shipment.asn_number && (
                <div>
                  <div className="label">{t('shipmentPanel.asnNumber')}</div>
                  <div className="text-sm font-mono text-bone">{shipment.asn_number}</div>
                </div>
              )}
              {(shipment.package_count != null || shipment.total_weight_kg != null) && (
                <div>
                  <div className="label">{t('shipmentPanel.asnSummary')}</div>
                  <div className="text-sm text-steel-2">
                    {shipment.package_count != null && `${shipment.package_count} ${t('shipmentPanel.packages')}`}
                    {shipment.package_count != null && shipment.total_weight_kg != null && ' · '}
                    {shipment.total_weight_kg != null && `${shipment.total_weight_kg} kg`}
                  </div>
                </div>
              )}
              <div>
                <div className="label">{t('shipmentPanel.shippedAt')}</div>
                <div className="text-sm text-steel-2">
                  {shipment.shipped_at
                    ? format(new Date(shipment.shipped_at), 'd MMM yyyy', { locale: dateLocale })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="label">{t('shipmentPanel.estimatedArrival')}</div>
                <div className="text-sm text-steel-2">
                  {shipment.estimated_arrival
                    ? format(new Date(shipment.estimated_arrival), 'd MMM yyyy', {
                        locale: dateLocale,
                      })
                    : '—'}
                </div>
              </div>
              {shipment.notes && (
                <div className="sm:col-span-2">
                  <div className="label">{t('shipmentPanel.notes')}</div>
                  <p className="text-sm text-steel-2">{shipment.notes}</p>
                </div>
              )}
              {shipment.delivery_confirmed_at ? (
                <div className="sm:col-span-2 text-sm text-success">
                  {t('shipmentPanel.confirmedAt', {
                    name: shipment.delivery_confirmed_by ?? '—',
                    date: format(new Date(shipment.delivery_confirmed_at), 'd MMM yyyy', {
                      locale: dateLocale,
                    }),
                  })}
                </div>
              ) : mode === 'customer' ? (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    disabled={saving}
                    onClick={() => void confirmDelivery(shipment.id)}
                  >
                    {t('shipmentPanel.confirmDelivery')}
                  </button>
                </div>
              ) : null}
              {mode === 'admin' && (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="text-xs text-arc-2 hover:underline"
                    onClick={() => startEdit(shipment)}
                  >
                    {t('common.edit')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
