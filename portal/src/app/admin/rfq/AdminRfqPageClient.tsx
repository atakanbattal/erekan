'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { Download, FileUp, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { RfqRequest } from '@/lib/portal/types-ext';
import type { RfqStatus } from '@/lib/stages';

interface AdminRfqPageClientProps {
  requests: RfqRequest[];
}

const RFQ_STATUSES: RfqStatus[] = [
  'submitted',
  'reviewing',
  'quoted',
  'approved',
  'rejected',
  'converted',
];

export function AdminRfqPageClient({ requests }: AdminRfqPageClientProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [notesById, setNotesById] = useState<Record<string, string>>(() =>
    Object.fromEntries(requests.map((r) => [r.id, r.admin_notes ?? '']))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState<string | null>(null);

  async function updateStatus(id: string, status: RfqStatus) {
    setSavingId(id);
    setError('');

    const { error: updateError } = await supabase
      .from('rfq_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    setSavingId(null);

    if (updateError) {
      setError(t('adminRfqPage.saveError', { message: updateError.message }));
      return;
    }

    router.refresh();
  }

  async function saveNotes(id: string) {
    setSavingId(id);
    setError('');

    const { error: updateError } = await supabase
      .from('rfq_requests')
      .update({
        admin_notes: notesById[id]?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSavingId(null);

    if (updateError) {
      setError(t('adminRfqPage.saveError', { message: updateError.message }));
      return;
    }

    router.refresh();
  }

  async function uploadQuote(id: string, file: File) {
    setUploadingId(id);
    setError('');
    setSuccessId(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`/api/admin/rfq/${id}/quote`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setUploadingId(null);

    if (!res.ok) {
      setError(t('adminRfqPage.saveError', { message: data.error ?? 'Unknown error' }));
      return;
    }

    setSuccessId(id);
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

  if (requests.length === 0) {
    return <div className="portal-empty-state">{t('adminRfqPage.empty')}</div>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {requests.map((rfq) => {
        const customer = rfq.customers;
        return (
          <div key={rfq.id} className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h2 className="font-bold text-bone text-lg">{rfq.title}</h2>
                <p className="text-sm text-steel-2 mt-1">{rfq.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-steel-2">
                  <span>
                    {t('adminRfqPage.customer')}:{' '}
                    <span className="text-bone">{customer?.company_name ?? '—'}</span>
                  </span>
                  <span>
                    {t('adminRfqPage.submittedAt')}:{' '}
                    {format(new Date(rfq.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
                  </span>
                  {rfq.material && (
                    <span>
                      {t('common.material')}: {rfq.material}
                    </span>
                  )}
                  {rfq.standard && (
                    <span>
                      {t('common.standard')}: {rfq.standard}
                    </span>
                  )}
                </div>
              </div>

              <select
                className="input w-auto min-w-[160px]"
                value={rfq.status}
                disabled={savingId === rfq.id}
                onChange={(e) => updateStatus(rfq.id, e.target.value as RfqStatus)}
              >
                {RFQ_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`adminRfqPage.status.${status}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">{t('adminRfqPage.adminNotes')}</label>
              <textarea
                className="input min-h-[80px] resize-y"
                value={notesById[rfq.id] ?? ''}
                onChange={(e) =>
                  setNotesById((prev) => ({ ...prev, [rfq.id]: e.target.value }))
                }
              />
              <button
                type="button"
                className="btn-secondary text-xs mt-2"
                disabled={savingId === rfq.id}
                onClick={() => saveNotes(rfq.id)}
              >
                {savingId === rfq.id ? t('adminRfqPage.saving') : t('adminRfqPage.saveNotes')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-ink-4">
              {rfq.quote_file_path && (
                <button
                  type="button"
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  onClick={() => downloadQuote(rfq)}
                >
                  <Download size={14} />
                  {t('adminRfqPage.downloadQuote')}
                </button>
              )}

              <label className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer">
                {uploadingId === rfq.id ? (
                  <>
                    <Upload size={14} className="animate-pulse" />
                    {t('adminRfqPage.uploading')}
                  </>
                ) : (
                  <>
                    <FileUp size={14} />
                    {t('adminRfqPage.uploadQuote')}
                  </>
                )}
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  disabled={uploadingId === rfq.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadQuote(rfq.id, file);
                    e.target.value = '';
                  }}
                />
              </label>

              {successId === rfq.id && (
                <span className="text-xs text-success">{t('adminRfqPage.quoteUploaded')}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
