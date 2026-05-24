'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { DOCUMENT_TYPES, type DocumentType } from '@/lib/stages';
import { UPLOAD_ACCEPT } from '@/lib/documents';
import { useI18n } from '@/lib/i18n/context';
import { getDocTypeLabel } from '@/lib/i18n/helpers';

interface CustomerUploadSectionProps {
  orderId: string;
}

export function CustomerUploadSection({ orderId }: CustomerUploadSectionProps) {
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocumentType>('other');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const docTypeOptions = Object.keys(DOCUMENT_TYPES) as DocumentType[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', docType);
    if (description.trim()) {
      formData.append('description', description.trim());
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(t('customerUpload.error', { message: data.error ?? res.statusText }));
        setUploading(false);
        return;
      }

      setSuccess(true);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(
        t('customerUpload.error', {
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded bg-arc-2/10 border border-arc-2/20 flex items-center justify-center shrink-0">
          <Upload size={18} className="text-arc-2" />
        </div>
        <div>
          <h3 className="font-bold text-bone">{t('customerUpload.title')}</h3>
          <p className="text-xs text-steel-2 mt-0.5">{t('customerUpload.desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">{t('customerUpload.docType')}</label>
          <select
            className="input"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
          >
            {docTypeOptions.map((type) => (
              <option key={type} value={type}>
                {getDocTypeLabel(t, type)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('customerUpload.description')}</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('customerUpload.descriptionPlaceholder')}
          />
        </div>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="input file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-arc-2 file:text-ink-1 file:text-sm file:font-medium"
          required
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{t('customerUpload.success')}</p>}

      <button type="submit" className="btn-primary flex items-center gap-2" disabled={uploading}>
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t('customerUpload.uploading')}
          </>
        ) : (
          <>
            <Upload size={16} />
            {t('customerUpload.upload')}
          </>
        )}
      </button>
    </form>
  );
}
