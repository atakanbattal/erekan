'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ClipboardCheck, Pencil, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { NdtMethod, NdtResult } from '@/lib/stages';
import type { NdtRecord } from '@/lib/portal/types-ext';

interface NdtRecordsPanelProps {
  records: NdtRecord[];
  mode: 'admin' | 'customer';
  orderId: string;
  staffName?: string;
}

const NDT_METHODS: NdtMethod[] = ['ut', 'mt', 'pt', 'vt', 'rt'];
const NDT_RESULTS: NdtResult[] = ['pass', 'conditional', 'fail', 'pending'];

const emptyForm = {
  method: 'vt' as NdtMethod,
  result: 'pending' as NdtResult,
  inspector_name: '',
  report_number: '',
  notes: '',
  is_visible_to_customer: true,
  tested_at: '',
};

export function NdtRecordsPanel({
  records,
  mode,
  orderId,
  staffName,
}: NdtRecordsPanelProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const visibleRecords =
    mode === 'customer' ? records.filter((r) => r.is_visible_to_customer) : records;

  function startEdit(record: NdtRecord) {
    setEditingId(record.id);
    setForm({
      method: record.method,
      result: record.result,
      inspector_name: record.inspector_name ?? '',
      report_number: record.report_number ?? '',
      notes: record.notes ?? '',
      is_visible_to_customer: record.is_visible_to_customer,
      tested_at: record.tested_at ? record.tested_at.slice(0, 10) : '',
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
      method: form.method,
      result: form.result,
      inspector_name: form.inspector_name.trim() || null,
      report_number: form.report_number.trim() || null,
      notes: form.notes.trim() || null,
      is_visible_to_customer: form.is_visible_to_customer,
      tested_at: form.tested_at ? new Date(form.tested_at).toISOString() : null,
    };

    const { error: saveError } = editingId
      ? await supabase.from('ndt_records').update(payload).eq('id', editingId)
      : await supabase.from('ndt_records').insert(payload);

    if (saveError) {
      setError(t('ndtPanel.saveError', { message: saveError.message }));
      setSaving(false);
      return;
    }

    if (!editingId) {
      await supabase.from('order_activity').insert({
        order_id: orderId,
        action: 'ndt_recorded',
        description: `NDT kaydı eklendi — ${t(`ndtMethods.${form.method}`)} / ${t(`ndtResults.${form.result}`)}`,
        actor_name: staffName,
      });
    }

    setSaving(false);
    resetForm();
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-arc-2" />
          <h3 className="font-bold text-bone">{t('ndtPanel.title')}</h3>
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
            {t('ndtPanel.addRecord')}
          </button>
        )}
      </div>

      {mode === 'admin' && showForm && (
        <form onSubmit={handleSubmit} className="rounded border border-ink-4 bg-ink-1 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t('ndtPanel.method')}</label>
              <select
                className="input"
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as NdtMethod }))}
              >
                {NDT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {t(`ndtMethods.${method}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('ndtPanel.result')}</label>
              <select
                className="input"
                value={form.result}
                onChange={(e) => setForm((f) => ({ ...f, result: e.target.value as NdtResult }))}
              >
                {NDT_RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {t(`ndtResults.${result}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('ndtPanel.inspector')}</label>
              <input
                className="input"
                value={form.inspector_name}
                onChange={(e) => setForm((f) => ({ ...f, inspector_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('ndtPanel.reportNumber')}</label>
              <input
                className="input"
                value={form.report_number}
                onChange={(e) => setForm((f) => ({ ...f, report_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('ndtPanel.testedAt')}</label>
              <input
                type="date"
                className="input"
                value={form.tested_at}
                onChange={(e) => setForm((f) => ({ ...f, tested_at: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-steel-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_visible_to_customer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_visible_to_customer: e.target.checked }))
                  }
                />
                {t('ndtPanel.visibleToCustomer')}
              </label>
            </div>
          </div>
          <div>
            <label className="label">{t('ndtPanel.notes')}</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? t('common.saving') : t('ndtPanel.saveRecord')}
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={resetForm}>
              {t('ndtPanel.cancelEdit')}
            </button>
          </div>
        </form>
      )}

      {visibleRecords.length === 0 ? (
        <p className="text-sm text-steel-2 text-center py-4">{t('ndtPanel.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-ink-4 bg-ink-3">
                <th className="text-left p-3 table-head">{t('ndtPanel.method')}</th>
                <th className="text-left p-3 table-head">{t('ndtPanel.result')}</th>
                <th className="text-left p-3 table-head hidden md:table-cell">
                  {t('ndtPanel.inspector')}
                </th>
                <th className="text-left p-3 table-head hidden lg:table-cell">
                  {t('ndtPanel.reportNumber')}
                </th>
                <th className="text-left p-3 table-head hidden sm:table-cell">
                  {t('ndtPanel.testedAt')}
                </th>
                {mode === 'admin' && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id} className="border-b border-ink-4 hover:bg-ink-3/30">
                  <td className="p-3 text-bone">{t(`ndtMethods.${record.method}`)}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        record.result === 'pass'
                          ? 'text-success border-success/30 bg-success/10'
                          : record.result === 'fail'
                            ? 'text-danger border-danger/30 bg-danger/10'
                            : record.result === 'conditional'
                              ? 'text-warning border-warning/30 bg-warning/10'
                              : 'text-steel-2 border-ink-4 bg-ink-1'
                      }`}
                    >
                      {t(`ndtResults.${record.result}`)}
                    </span>
                  </td>
                  <td className="p-3 text-steel-2 hidden md:table-cell">
                    {record.inspector_name ?? '—'}
                  </td>
                  <td className="p-3 text-steel-2 hidden lg:table-cell font-mono text-xs">
                    {record.report_number ?? '—'}
                  </td>
                  <td className="p-3 text-steel-2 hidden sm:table-cell">
                    {record.tested_at
                      ? format(new Date(record.tested_at), 'd MMM yyyy', { locale: dateLocale })
                      : '—'}
                  </td>
                  {mode === 'admin' && (
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        className="text-arc-2 hover:text-bone"
                        onClick={() => startEdit(record)}
                        title={t('ndtPanel.editRecord')}
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
