import { DOCUMENT_TYPES, type DocumentType } from './stages';

export function generateSerialNumber(jobNumber: string): string {
  const num = jobNumber.replace(/\D/g, '').slice(-4) || '0001';
  return `SER-${num.padStart(4, '0')}`;
}

export function generateHeatNumber(jobNumber: string): string {
  const suffix = jobNumber.split('-').pop() ?? '0001';
  return `HEAT-${suffix}`;
}

export function generateWpsRef(jobNumber: string): string {
  const suffix = jobNumber.split('-').pop() ?? '001';
  return `WPS-${parseInt(suffix, 10) || 1}-A`;
}

export function generateDocumentName(
  jobNumber: string,
  docType: DocumentType,
  originalFilename: string
): string {
  const ext = originalFilename.split('.').pop()?.toLowerCase() ?? 'pdf';
  const typeSlug = docType.toUpperCase().replace(/_/g, '-');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${jobNumber}_${typeSlug}_${date}.${ext}`;
}

export function formatActivityDescription(
  description: string | null,
  action: string
): string {
  const text = description ?? action;
  if (!text || text.includes('undefined')) {
    if (action === 'stage_updated') return 'Üretim aşaması güncellendi';
    if (action === 'document_uploaded') return 'Belge yüklendi';
    if (action === 'order_created') return 'Sipariş oluşturuldu';
    if (action === 'status_changed') return 'Sipariş durumu güncellendi';
    return text?.replace(/ → undefined$/, '') ?? 'Güncelleme yapıldı';
  }
  return text;
}

export function docTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES[type] ?? type;
}

export function formatActorName(actorName: string | null, isCustomerView: boolean): string | null {
  if (!actorName) return null;
  if (isCustomerView && (actorName === 'Admin' || actorName === 'ArmaWeld Admin')) {
    return 'ArmaWeld';
  }
  return actorName;
}
