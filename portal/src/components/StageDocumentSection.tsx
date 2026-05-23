'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  STAGE_DOCUMENT_TYPES,
  STAGE_DEFAULT_DOC_TYPE,
  type DocumentType,
} from '@/lib/stages';
import { generateDocumentName } from '@/lib/generators';
import { getStageDocuments, UPLOAD_ACCEPT, mimeFromFileName } from '@/lib/documents';
import { DocumentList, StageDocTypeChecklist } from '@/components/DocumentList';
import { DocumentUploadFields } from '@/components/DocumentUploadFields';
import type { OrderDocument } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface StageDocumentSectionProps {
  mode: 'admin' | 'customer';
  orderId: string;
  jobNumber: string;
  stageNumber: number;
  stageId?: string;
  stageTitle: string;
  documents: OrderDocument[];
  staffName?: string;
  onUploaded?: () => void;
}

export function StageDocumentSection({
  mode,
  orderId,
  jobNumber,
  stageNumber,
  stageId,
  stageTitle,
  documents,
  staffName,
  onUploaded,
}: StageDocumentSectionProps) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const allowedTypes = STAGE_DOCUMENT_TYPES[stageNumber] ?? ['other'];
  const defaultType = STAGE_DEFAULT_DOC_TYPE[stageNumber] ?? 'other';
  const [docType, setDocType] = useState<DocumentType>(defaultType);
  const [visible, setVisible] = useState(true);
  const [description, setDescription] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const stageDocs = getStageDocuments(documents, stageNumber, stageId) as OrderDocument[];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !staffName) return;

    setUploading(true);
    const docName = generateDocumentName(jobNumber, docType, file.name);
    const filePath = `${orderId}/${docName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const note = description.trim() || null;

    const { error: uploadError } = await supabase.storage
      .from('order-documents')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      alert(t('documents.uploadError', { message: uploadError.message }));
      setUploading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error: dbError } = await supabase.from('order_documents').insert({
      order_id: orderId,
      stage_id: stageId || null,
      name: docName,
      document_type: docType,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || mimeFromFileName(file.name),
      description: note,
      uploaded_by: user?.id,
      is_visible_to_customer: visible,
    });

    if (dbError) {
      alert(t('documents.saveError', { message: dbError.message }));
      setUploading(false);
      return;
    }

    await supabase.from('order_activity').insert({
      order_id: orderId,
      action: 'document_uploaded',
      description: note
        ? `${stageTitle}: belge yüklendi — ${docName} (${note})`
        : `${stageTitle}: belge yüklendi — ${docName}`,
      actor_name: staffName,
    });

    setUploading(false);
    setDescription('');
    onUploaded?.();
    router.refresh();
    e.target.value = '';
  }

  if (mode === 'customer' && stageDocs.filter((d) => d.is_visible_to_customer).length === 0) {
    return null;
  }

  return (
    <div className="rounded border border-ink-4 bg-ink-1 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-arc-2 shrink-0" />
        <span className="text-sm font-medium text-bone">{t('documents.stageDocs')}</span>
        {stageDocs.length > 0 && (
          <span className="text-xs text-steel-2">({stageDocs.length})</span>
        )}
      </div>

      {mode === 'admin' && (
        <StageDocTypeChecklist allowedTypes={allowedTypes} documents={stageDocs} />
      )}

      {mode === 'admin' && (
        <div className="space-y-3 pt-1 border-t border-ink-4">
          <DocumentUploadFields
            docType={docType}
            onDocTypeChange={setDocType}
            docTypeOptions={allowedTypes}
            visible={visible}
            onVisibleChange={setVisible}
            description={description}
            onDescriptionChange={setDescription}
          />
          <label className="btn-primary flex items-center justify-center gap-2 cursor-pointer text-sm py-2">
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> {t('documents.uploading')}</>
            ) : (
              <><Upload size={16} /> {t('documents.upload')}</>
            )}
            <input
              type="file"
              className="hidden"
              accept={UPLOAD_ACCEPT}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      <DocumentList
        documents={stageDocs}
        showHidden={mode === 'admin'}
        compact
        groupByType={mode === 'customer'}
        groupTypeOrder={allowedTypes}
        emptyMessage={mode === 'admin' ? t('documents.emptyStage') : undefined}
      />
    </div>
  );
}
