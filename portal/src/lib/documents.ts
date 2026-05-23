import type { DocumentType } from './stages';
import { getDocumentsForStage } from './stages';

export const GENERAL_DOC_PREFIX = '/general/';

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
] as const;

export const UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.join(',');

export function isGeneralDocument(doc: { file_path?: string | null }) {
  return !!doc.file_path?.includes(GENERAL_DOC_PREFIX);
}

export function generalDocumentPath(orderId: string, fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${orderId}${GENERAL_DOC_PREFIX}${safe}`;
}

export function getGeneralOrderDocuments<
  T extends { id: string; file_path: string; stage_id: string | null; document_type: DocumentType },
>(documents: T[]) {
  return documents.filter(isGeneralDocument);
}

export function getStageDocuments<
  T extends { id: string; file_path: string; stage_id: string | null; document_type: DocumentType },
>(documents: T[], stageNumber: number, stageId?: string | null) {
  return getDocumentsForStage(documents, stageNumber, stageId).filter(
    (doc) => !isGeneralDocument(doc)
  );
}

export function canPreviewMime(mime: string | null | undefined, fileName?: string) {
  if (mime?.startsWith('image/') || mime === 'application/pdf') return true;
  const name = fileName?.toLowerCase() ?? '';
  if (name.endsWith('.pdf')) return true;
  if (/\.(png|jpe?g|webp|gif)$/i.test(name)) return true;
  return false;
}

export function mimeFromFileName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}
