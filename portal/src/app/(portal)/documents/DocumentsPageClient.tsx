'use client';

import { useState } from 'react';
import { DocumentList } from '@/components/DocumentList';
import { useI18n } from '@/lib/i18n/context';
import type { OrderDocument } from '@/lib/types';

interface DocumentsPageClientProps {
  documents: (OrderDocument & { orders: { job_number: string; title: string } })[];
  orderOptions: { id: string; job_number: string; title: string }[];
}

export function DocumentsPageClient({ documents, orderOptions }: DocumentsPageClientProps) {
  const { t } = useI18n();
  const [filterOrderId, setFilterOrderId] = useState('');

  const filtered = filterOrderId
    ? documents.filter((d) => d.order_id === filterOrderId)
    : documents;

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('documentsPage.title')}</h1>
        <p className="portal-page-subtitle">{t('documentsPage.subtitle')}</p>
      </div>

      {orderOptions.length > 1 && (
        <div className="mb-6 max-w-sm">
          <label className="label">{t('documentsPage.filterByOrder')}</label>
          <select
            className="input"
            value={filterOrderId}
            onChange={(e) => setFilterOrderId(e.target.value)}
          >
            <option value="">{t('documentsPage.allOrders')}</option>
            {orderOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.job_number} — {o.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card p-4 sm:p-6">
        <DocumentList
          documents={filtered}
          emptyMessage={t('documentsPage.noDocuments')}
        />
      </div>
    </div>
  );
}
