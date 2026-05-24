'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { Download, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { RfqRequest } from '@/lib/portal/types-ext';
import type { RfqStatus } from '@/lib/stages';

interface RfqPageClientProps {
  customerId: string;
  requests: RfqRequest[];
}

export function RfqPageClient({ customerId, requests }: RfqPageClientProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [standard, setStandard] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess(false);

    const { data: inserted, error: insertError } = await supabase
      .from('rfq_requests')
      .insert({
        customer_id: customerId,
        title: title.trim(),
        description: description.trim(),
        material: material.trim() || null,
        quantity: quantity.trim() || null,
        standard: standard.trim() || null,
        deadline: deadline || null,
        status: 'submitted',
      })
      .select('id, title')
      .single();

    if (insertError) {
      setSubmitting(false);
      setError(t('rfqPage.submitError', { message: insertError.message }));
      return;
    }

    try {
      await fetch('/api/rfq/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfqId: inserted.id, title: inserted.title }),
      });
    } catch {
      // RFQ saved; notification is best-effort
    }

    setSubmitting(false);
    setSuccess(true);
    setTitle('');
    setDescription('');
    setMaterial('');
    setQuantity('');
    setStandard('');
    setDeadline('');
    router.refresh();
  }

  async function downloadQuote(rfq: RfqRequest) {
    if (!rfq.quote_file_path) return;

    const { data, error: downloadError } = await supabase.storage
      .from('order-documents')
      .createSignedUrl(rfq.quote_file_path, 3600);

    if (downloadError || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  }

  function statusBadgeClass(status: RfqStatus) {
    switch (status) {
      case 'quoted':
      case 'approved':
      case 'converted':
        return 'bg-success/10 text-success';
      case 'rejected':
        return 'bg-danger/10 text-danger';
      case 'reviewing':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-arc-2/10 text-arc-2';
    }
  }

  return (
    <div className="portal-dashboard-grid portal-dashboard-grid--2">
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <h2 className="font-bold text-bone">{t('rfqPage.newRfq')}</h2>

        <div>
          <label className="label">{t('rfqPage.projectTitle')}</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">{t('rfqPage.description')}</label>
          <textarea
            className="input min-h-[120px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{t('rfqPage.material')}</label>
            <input className="input" value={material} onChange={(e) => setMaterial(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('rfqPage.quantity')}</label>
            <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{t('rfqPage.standard')}</label>
            <input className="input" value={standard} onChange={(e) => setStandard(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('rfqPage.deadline')}</label>
            <input
              type="date"
              className="input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{t('rfqPage.submitSuccess')}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('rfqPage.submitting') : t('rfqPage.submit')}
        </button>
      </form>

      <div className="card p-6">
        <h2 className="font-bold text-bone mb-4">{t('rfqPage.myRequests')}</h2>

        {requests.length === 0 ? (
          <p className="text-sm text-steel-2 text-center py-8">{t('rfqPage.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((rfq) => (
              <li key={rfq.id} className="rounded border border-ink-4 bg-ink-1/50 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText size={16} className="text-arc-2 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium text-bone truncate">{rfq.title}</div>
                      <p className="text-xs text-steel-2 mt-1 line-clamp-2">{rfq.description}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${statusBadgeClass(rfq.status)}`}
                  >
                    {t(`rfqPage.status.${rfq.status}`)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-steel-2">
                  {rfq.material && (
                    <span>
                      {t('rfqPage.material')}: {rfq.material}
                    </span>
                  )}
                  {rfq.deadline && (
                    <span>
                      {t('rfqPage.deadline')}:{' '}
                      {format(new Date(rfq.deadline), 'dd MMM yyyy', { locale: dateLocale })}
                    </span>
                  )}
                </div>

                {rfq.quote_file_path && (
                  <button
                    type="button"
                    className="btn-secondary text-xs mt-3 flex items-center gap-1.5"
                    onClick={() => downloadQuote(rfq)}
                  >
                    <Download size={14} />
                    {t('rfqPage.downloadQuote')}
                    {rfq.quote_file_name ? ` — ${rfq.quote_file_name}` : ''}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
