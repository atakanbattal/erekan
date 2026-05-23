'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, FolderOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DOCUMENT_TYPES, type DocumentType } from '@/lib/stages';
import {
  generalDocumentPath,
  getGeneralOrderDocuments,
  UPLOAD_ACCEPT,
  mimeFromFileName,
} from '@/lib/documents';
import { DocumentList } from '@/components/DocumentList';
import { DocumentUploadFields } from '@/components/DocumentUploadFields';
import type { OrderDocument } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface OrderFilesSectionProps {
  mode: 'admin' | 'customer';
  orderId: string;
  jobNumber: string;
  documents: OrderDocument[];
  staffName?: string;
  onUploaded?: () => void;
}

export function OrderFilesSection({
  mode,
  orderId,
  jobNumber,
  documents,
  staffName,
  onUploaded,
}: OrderFilesSectionProps) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>('other');
  const [visible, setVisible] = useState(true);
  const [description, setDescription] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const generalDocs = getGeneralOrderDocuments(documents);
  const docTypeOptions = Object.keys(DOCUMENT_TYPES) as DocumentType[];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !staffName) return;

    setUploading(true);
    const filePath = generalDocumentPath(orderId, file.name);
    const displayName = `${jobNumber}_${file.name}`;
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
      stage_id: null,
      name: displayName,
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
        ? `Genel dosya yüklendi — ${displayName} (${note})`
        : `Genel dosya yüklendi — ${displayName}`,
      actor_name: staffName,
    });

    setUploading(false);
    setDescription('');
    onUploaded?.();
    router.refresh();
    e.target.value = '';
  }

  if (mode === 'customer' && generalDocs.filter((d) => d.is_visible_to_customer).length === 0) {
    return null;
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded bg-arc-2/10 border border-arc-2/20 flex items-center justify-center shrink-0">
          <FolderOpen size={18} className="text-arc-2" />
        </div>
        <div>
          <h3 className="font-bold text-bone">{t('documents.generalFiles')}</h3>
          <p className="text-xs text-steel-2 mt-0.5">{t('documents.generalFilesDesc')}</p>
        </div>
      </div>

      {mode === 'admin' && (
        <div className="space-y-3 pt-1 border-t border-ink-4">
          <DocumentUploadFields
            docType={docType}
            onDocTypeChange={setDocType}
            docTypeOptions={docTypeOptions}
            visible={visible}
            onVisibleChange={setVisible}
            description={description}
            onDescriptionChange={setDescription}
          />
          <label className="btn-primary flex items-center justify-center gap-2 cursor-pointer text-sm py-2.5">
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {t('documents.uploading')}
              </>
            ) : (
              <>
                <Upload size={16} /> {t('documents.uploadGeneral')}
              </>
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
        documents={generalDocs}
        showHidden={mode === 'admin'}
        emptyMessage={mode === 'admin' ? t('documents.emptyGeneral') : t('documents.empty')}
      />
    </div>
  );
}
