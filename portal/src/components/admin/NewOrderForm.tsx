'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PRODUCTION_STAGES } from '@/lib/stages';
import { generateSerialNumber, generateHeatNumber, generateWpsRef } from '@/lib/generators';
import type { Customer } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface NewOrderFormProps {
  customers: Customer[];
  staffName: string;
  templates?: { id: string; name: string; title_template: string; material: string | null; standard: string | null; description: string | null }[];
}

export function NewOrderForm({ customers, staffName, templates = [] }: NewOrderFormProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [heatNumber, setHeatNumber] = useState('');
  const [wpsRef, setWpsRef] = useState('');
  const [title, setTitle] = useState('');
  const [material, setMaterial] = useState('');
  const [standard, setStandard] = useState('');
  const [description, setDescription] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('730');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setTitle(tpl.title_template);
    setMaterial(tpl.material ?? '');
    setStandard(tpl.standard ?? '');
    setDescription(tpl.description ?? '');
  }

  useEffect(() => {
    async function loadNumbers() {
      const { data } = await supabase.rpc('generate_job_number');
      if (data) {
        setJobNumber(data);
        setSerialNumber(generateSerialNumber(data));
        setHeatNumber(generateHeatNumber(data));
        setWpsRef(generateWpsRef(data));
      }
    }
    loadNumbers();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData(e.currentTarget);
    const customerId = form.get('customer_id') as string;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        job_number: jobNumber,
        serial_number: serialNumber,
        title: form.get('title') as string,
        description: (form.get('description') as string) || null,
        material: (form.get('material') as string) || null,
        quantity: (form.get('quantity') as string) || null,
        standard: (form.get('standard') as string) || 'EN 1090 EXC2',
        heat_number: heatNumber,
        wps_ref: wpsRef,
        expected_delivery: (form.get('expected_delivery') as string) || null,
        warranty_days: Number(warrantyDays) > 0 ? Number(warrantyDays) : 730,
        status: 'active',
        current_stage: 1,
      })
      .select()
      .single();

    if (orderError || !order) {
      setError(orderError?.message ?? t('forms.createOrderFailed'));
      setLoading(false);
      return;
    }

    await supabase.from('order_stages').insert(
      PRODUCTION_STAGES.map((s) => ({
        order_id: order.id,
        stage_number: s.number,
        stage_code: s.code,
        title: s.title,
        status: s.number === 1 ? 'in_progress' : 'pending',
        started_at: s.number === 1 ? new Date().toISOString() : null,
        heat_number: s.number === 2 ? heatNumber : null,
        wps_ref: s.number === 4 ? wpsRef : null,
      }))
    );

    await supabase.from('order_activity').insert({
      order_id: order.id,
      action: 'order_created',
      description: `Sipariş açıldı: ${jobNumber} — ${form.get('title')}`,
      actor_name: staffName,
    });

    router.push(`/admin/orders/${order.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4 max-w-2xl">
      {error && (
        <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
      )}

      <div>
        <label className="label">{t('forms.customerRequired')}</label>
        <select name="customer_id" className="input" required>
          <option value="">{t('forms.selectPlaceholder')}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.company_name} — {c.email}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t('forms.jobNumberAuto')}</label>
          <input className="input font-mono" value={jobNumber} readOnly />
        </div>
        <div>
          <label className="label">{t('forms.serialNumberAuto')}</label>
          <input className="input font-mono" value={serialNumber} readOnly />
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <label className="label">{t('templatesPage.title')}</label>
          <select className="input" onChange={(e) => applyTemplate(e.target.value)} defaultValue="">
            <option value="">{t('forms.selectPlaceholder')}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">{t('forms.projectTitle')}</label>
        <input name="title" className="input" placeholder={t('forms.projectTitlePlaceholder')} required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="label">{t('forms.description')}</label>
        <textarea name="description" className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t('common.material')}</label>
          <input name="material" className="input" placeholder={t('forms.materialPlaceholder')} value={material} onChange={(e) => setMaterial(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('forms.quantity')}</label>
          <input name="quantity" className="input" placeholder={t('forms.quantityPlaceholder')} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label">{t('common.standard')}</label>
          <input name="standard" className="input" value={standard} onChange={(e) => setStandard(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('forms.heatNumberAuto')}</label>
          <input className="input font-mono" value={heatNumber} readOnly />
          <p className="text-xs text-steel-2 mt-1">{t('forms.heatNumberHint')}</p>
        </div>
        <div>
          <label className="label">{t('forms.wpsRefAuto')}</label>
          <input className="input font-mono" value={wpsRef} readOnly />
          <p className="text-xs text-steel-2 mt-1">{t('forms.wpsRefHint')}</p>
        </div>
      </div>

      <div>
        <label className="label">{t('forms.expectedDelivery')}</label>
        <input name="expected_delivery" type="date" className="input" />
      </div>

      <div className="max-w-xs">
        <label className="label">{t('forms.warrantyDays')}</label>
        <input
          type="number"
          min={1}
          max={3650}
          className="input"
          value={warrantyDays}
          onChange={(e) => setWarrantyDays(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-steel-2">{t('forms.warrantyDaysHint')}</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading || !jobNumber}>
          {loading ? t('forms.creating') : t('forms.createOrder')}
        </button>
        <Link href="/admin/orders" className="btn-secondary">{t('common.cancel')}</Link>
      </div>
    </form>
  );
}
