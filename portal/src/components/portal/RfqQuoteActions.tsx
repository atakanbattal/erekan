'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, RefreshCw, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import type { RfqRequest } from '@/lib/portal/types-ext';

interface RfqQuoteActionsProps {
  rfq: RfqRequest;
  responderName: string;
}

export function RfqQuoteActions({ rfq, responderName }: RfqQuoteActionsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [error, setError] = useState('');

  if (rfq.status !== 'quoted' || !rfq.quote_file_path) return null;

  async function respond(response: 'approved' | 'rejected' | 'revision') {
    setLoading(response === 'revision' ? 'revision' : response === 'approved' ? 'approve' : 'reject');
    setError('');

    const res = await fetch(`/api/rfq/${rfq.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response,
        note: note.trim() || null,
        responderName,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t('rfqPage.responseError'));
      setLoading(null);
      return;
    }

    setLoading(null);
    router.refresh();
  }

  return (
    <div className="rfq-quote-actions">
      <h4 className="font-semibold text-bone mb-2">{t('rfqPage.quoteActionsTitle')}</h4>
      <p className="text-sm text-steel-2 mb-3">{t('rfqPage.quoteActionsDesc')}</p>
      <textarea
        className="input min-h-[80px] resize-y mb-3"
        placeholder={t('rfqPage.responseNotePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <p className="text-sm text-danger mb-2">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary text-sm flex items-center gap-1.5"
          disabled={!!loading}
          onClick={() => respond('approved')}
        >
          <Check size={14} />
          {loading === 'approve' ? t('common.saving') : t('rfqPage.approveQuote')}
        </button>
        <button
          type="button"
          className="btn-secondary text-sm flex items-center gap-1.5"
          disabled={!!loading}
          onClick={() => respond('revision')}
        >
          <RefreshCw size={14} />
          {loading === 'revision' ? t('common.saving') : t('rfqPage.requestRevision')}
        </button>
        <button
          type="button"
          className="btn-danger-outline text-sm flex items-center gap-1.5"
          disabled={!!loading}
          onClick={() => respond('rejected')}
        >
          <X size={14} />
          {loading === 'reject' ? t('common.saving') : t('rfqPage.rejectQuote')}
        </button>
      </div>
    </div>
  );
}
