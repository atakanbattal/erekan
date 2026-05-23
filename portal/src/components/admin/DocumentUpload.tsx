'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DOCUMENT_TYPES, type DocumentType } from '@/lib/stages';
import { generateDocumentName } from '@/lib/generators';

interface DocumentUploadProps {
  orderId: string;
  jobNumber: string;
  stageId?: string;
  staffName: string;
  defaultDocType?: DocumentType;
  onUploaded: () => void;
}

export function DocumentUpload({
  orderId,
  jobNumber,
  stageId,
  staffName,
  defaultDocType = 'other',
  onUploaded,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>(defaultDocType);
  const [visible, setVisible] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const docName = generateDocumentName(jobNumber, docType, file.name);
    const ext = file.name.split('.').pop();
    const filePath = `${orderId}/${docName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('order-documents')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      alert('Yükleme hatası: ' + uploadError.message);
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
      mime_type: file.type || 'application/octet-stream',
      uploaded_by: user?.id,
      is_visible_to_customer: visible,
    });

    if (dbError) {
      alert('Kayıt hatası: ' + dbError.message);
      setUploading(false);
      return;
    }

    await supabase.from('order_activity').insert({
      order_id: orderId,
      action: 'document_uploaded',
      description: `Belge yüklendi: ${docName}`,
      actor_name: staffName,
    });

    setUploading(false);
    onUploaded();
    router.refresh();
    e.target.value = '';
  }

  return (
    <div id="document-upload" className="card p-4 space-y-3">
      <div className="eyebrow">Belge Yükle</div>
      <p className="text-xs text-steel-2">
        Dosya adı otomatik: {jobNumber}_TUR_TARİH.pdf formatında oluşturulur
      </p>

      <div>
        <label className="label">Belge Türü</label>
        <select className="input" value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
          {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-steel-3 cursor-pointer">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        Müşteriye görünür
      </label>

      <label className="btn-primary flex items-center justify-center gap-2 cursor-pointer">
        {uploading ? (
          <><Loader2 size={18} className="animate-spin" /> Yükleniyor...</>
        ) : (
          <><Upload size={18} /> PDF / Görsel Seç</>
        )}
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
