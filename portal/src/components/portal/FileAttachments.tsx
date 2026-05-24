'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, FileText, ImageIcon, Loader2 } from 'lucide-react';
import { UPLOAD_ACCEPT, canPreviewMime, mimeFromFileName } from '@/lib/documents';
import { useI18n } from '@/lib/i18n/context';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';

export interface FileAttachmentRecord {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function uploadMessageAttachments(messageId: string, files: File[]) {
  const results = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/messages/${messageId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Upload failed');
    }
    results.push(await res.json());
  }
  return results;
}

export async function uploadRfqAttachments(rfqId: string, files: File[]) {
  const results = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/rfq/${rfqId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Upload failed');
    }
    results.push(await res.json());
  }
  return results;
}

interface FilePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function FileAttachmentPicker({ files, onChange, disabled }: FilePickerProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  function addFiles(incoming: FileList | null) {
    if (!incoming?.length) return;
    setError('');

    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(t('attachments.fileTooLarge'));
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(t('attachments.maxFiles', { count: MAX_FILES }));
        break;
      }
      next.push(file);
    }
    onChange(next);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="file-attachment-picker">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary text-xs flex items-center gap-1.5"
          disabled={disabled || files.length >= MAX_FILES}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip size={14} />
          {t('attachments.addFile')}
        </button>
        <span className="text-xs text-steel-2">{t('attachments.hint')}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        accept={UPLOAD_ACCEPT}
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-danger mt-2">{error}</p>}

      {files.length > 0 && (
        <ul className="file-attachment-pending-list mt-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="file-attachment-pending-item">
              <FileText size={14} className="text-arc-2 shrink-0" />
              <span className="truncate text-sm text-bone">{file.name}</span>
              <button
                type="button"
                className="file-attachment-remove"
                onClick={() => removeFile(i)}
                aria-label={t('attachments.remove')}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AttachmentListProps {
  attachments: FileAttachmentRecord[];
  compact?: boolean;
}

export function AttachmentList({ attachments, compact }: AttachmentListProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string } | null>(null);

  if (attachments.length === 0) return null;

  async function openAttachment(att: FileAttachmentRecord) {
    const canPreview = canPreviewMime(att.mime_type, att.file_name);
    setLoading(att.id);

    try {
      if (canPreview) {
        const res = await fetch(`/api/attachments/${att.id}?inline=1`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? t('documents.previewFailed'));
        }

        const mime = att.mime_type || mimeFromFileName(att.file_name);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreview({ url: blobUrl, name: att.file_name, mime });
        return;
      }

      const res = await fetch(`/api/attachments/${att.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('documents.fetchError'));

      const response = await fetch(data.url);
      if (!response.ok) throw new Error(t('documents.downloadError'));

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = att.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('documents.fetchError'));
    } finally {
      setLoading(null);
    }
  }

  function closePreview() {
    if (preview?.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
  }

  return (
    <>
      <ul className={`message-attachments ${compact ? 'message-attachments--compact' : ''}`}>
        {attachments.map((att) => {
          const isImage =
            canPreviewMime(att.mime_type, att.file_name) && att.mime_type?.startsWith('image/');
          const isLoading = loading === att.id;

          return (
            <li key={att.id}>
              <button
                type="button"
                className="message-attachment-link"
                disabled={isLoading}
                onClick={() => openAttachment(att)}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : isImage ? (
                  <ImageIcon size={14} />
                ) : (
                  <FileText size={14} />
                )}
                <span className="truncate">{att.file_name}</span>
                {att.file_size != null && (
                  <span className="message-attachment-size">{formatFileSize(att.file_size)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {preview && <DocumentPreviewModal preview={preview} onClose={closePreview} />}
    </>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
