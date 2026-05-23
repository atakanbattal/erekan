'use client';

import type { DocumentType } from '@/lib/stages';
import { useI18n } from '@/lib/i18n/context';
import { getDocTypeLabel } from '@/lib/i18n/helpers';

interface DocumentUploadFieldsProps {
  docType: DocumentType;
  onDocTypeChange: (type: DocumentType) => void;
  docTypeOptions: DocumentType[];
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
}

export function DocumentUploadFields({
  docType,
  onDocTypeChange,
  docTypeOptions,
  visible,
  onVisibleChange,
  description,
  onDescriptionChange,
}: DocumentUploadFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="doc-upload-form space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <label className="table-head block mb-1">{t('documents.docType')}</label>
          <select
            className="input text-sm w-full"
            value={docType}
            onChange={(e) => onDocTypeChange(e.target.value as DocumentType)}
          >
            {docTypeOptions.map((key) => (
              <option key={key} value={key}>
                {getDocTypeLabel(t, key)}
              </option>
            ))}
          </select>
        </div>
        <label className="doc-upload-visible">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => onVisibleChange(e.target.checked)}
          />
          <span>{t('documents.visibleToCustomer')}</span>
        </label>
      </div>

      <div>
        <label className="table-head block mb-1">{t('documents.description')}</label>
        <textarea
          className="input text-sm min-h-[72px] resize-y"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('documents.descriptionPlaceholder')}
        />
      </div>
    </div>
  );
}
