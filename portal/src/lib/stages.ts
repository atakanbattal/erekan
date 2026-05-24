export const PRODUCTION_STAGES = [
  {
    number: 1,
    code: 'SOP.REV.ENG',
    title: 'Mühendislik Onayı',
    description: 'Teknik resim incelemesi, WPS seçimi ve üretim planı onayı.',
  },
  {
    number: 2,
    code: 'MAT.INCOMING',
    title: 'Malzeme Giriş Kontrolü',
    description: 'EN 10204 3.1 sertifika kontrolü ve görsel muayene.',
  },
  {
    number: 3,
    code: 'CUT.FORM',
    title: 'Kesim & Şekillendirme',
    description: 'CNC/lazer kesim, büküm ve parça numaralandırma.',
  },
  {
    number: 4,
    code: 'WELD.ACTIVE',
    title: 'Kaynak Üretimi',
    description: 'WPS kapsamında kaynak, kaynakçı kimliği ve parametre kaydı.',
  },
  {
    number: 5,
    code: 'NDT.INSPECT',
    title: 'NDT Muayene',
    description: 'VT, MT, PT, UT muayeneleri ve kabul/red kayıtları.',
  },
  {
    number: 6,
    code: 'SURFACE.COAT',
    title: 'Yüzey İşlem / Boya',
    description: 'Kumlama, astar, son kat boya ve kalınlık ölçümü.',
  },
  {
    number: 7,
    code: 'SHIP.DOSSIER',
    title: 'Sevkiyat & Dosya Teslimi',
    description: 'Final kontrol, irsaliye ve teknik dosya paketi teslimi.',
  },
] as const;

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type OrderStatus =
  | 'draft'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'shipped'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Taslak',
  active: 'Üretimde',
  on_hold: 'Beklemede',
  completed: 'Tamamlandı',
  shipped: 'Sevk Edildi',
  cancelled: 'İptal',
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  skipped: 'Atlandı',
};

export const DOCUMENT_TYPES = {
  mtc: 'Malzeme Sertifikası (MTC)',
  wps: 'WPS — Kaynak Prosedürü',
  wpqr: 'WPQR — Prosedür Onayı',
  ndt: 'NDT Muayene Raporu',
  welder_cert: 'Kaynakçı Yeterlilik Belgesi',
  incoming_inspection: 'Giriş Kontrol Raporu',
  dimension_report: 'Boyut Kontrol Raporu',
  coating_report: 'Boya / Yüzey Raporu',
  shipping_doc: 'Sevkiyat Belgesi',
  ce_dop: 'CE / DoP Beyanı',
  photo: 'Fotoğraf / Görsel',
  other: 'Diğer',
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

export type NotificationType =
  | 'message_reply'
  | 'stage_changed'
  | 'document_uploaded'
  | 'delivery_reminder'
  | 'delivery_overdue'
  | 'support_request'
  | 'rfq_submitted'
  | 'quote_ready'
  | 'shipment_updated'
  | 'ndt_result';

export type NotificationAudience = 'customer' | 'admin';

export type CustomerUserRole = 'admin' | 'quality' | 'procurement' | 'viewer';

export type NdtMethod = 'ut' | 'mt' | 'pt' | 'vt' | 'rt';

export type NdtResult = 'pass' | 'conditional' | 'fail' | 'pending';

export type RfqStatus =
  | 'submitted'
  | 'reviewing'
  | 'quoted'
  | 'approved'
  | 'rejected'
  | 'converted';

export const NDT_METHOD_LABELS: Record<NdtMethod, string> = {
  ut: 'UT — Ultrasonik',
  mt: 'MT — Manyetik Parçacık',
  pt: 'PT — Sıvı Penetrant',
  vt: 'VT — Görsel Muayene',
  rt: 'RT — Radyografi',
};

export const NDT_RESULT_LABELS: Record<NdtResult, string> = {
  pass: 'Uygun',
  conditional: 'Şartlı Uygun',
  fail: 'Red',
  pending: 'Bekliyor',
};

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  submitted: 'Gönderildi',
  reviewing: 'İnceleniyor',
  quoted: 'Teklif Verildi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  converted: 'Siparişe Dönüştü',
};

export const CUSTOMER_ROLE_LABELS: Record<CustomerUserRole, string> = {
  admin: 'Firma Yöneticisi',
  quality: 'Kalite',
  procurement: 'Satın Alma',
  viewer: 'Görüntüleyici',
};

export const STAGE_DOCUMENT_TYPES: Record<number, DocumentType[]> = {
  1: ['wps', 'wpqr', 'dimension_report', 'photo', 'other'],
  2: ['mtc', 'incoming_inspection', 'photo', 'other'],
  3: ['dimension_report', 'photo', 'other'],
  4: ['wps', 'wpqr', 'welder_cert', 'photo', 'other'],
  5: ['ndt', 'photo', 'other'],
  6: ['coating_report', 'photo', 'other'],
  7: ['shipping_doc', 'ce_dop', 'photo', 'other'],
};

/** Document types that are optional for stage completion tracking. */
export const STAGE_OPTIONAL_DOC_TYPES: DocumentType[] = ['photo', 'other'];

export const STAGE_DEFAULT_DOC_TYPE: Record<number, DocumentType> = {
  1: 'wpqr',
  2: 'mtc',
  3: 'dimension_report',
  4: 'wps',
  5: 'ndt',
  6: 'coating_report',
  7: 'shipping_doc',
};

const DOC_TYPE_PRIMARY_STAGE: Partial<Record<DocumentType, number>> = {
  mtc: 2,
  incoming_inspection: 2,
  wps: 4,
  wpqr: 1,
  ndt: 5,
  welder_cert: 4,
  dimension_report: 3,
  coating_report: 6,
  shipping_doc: 7,
  ce_dop: 7,
};

export function getDocumentsForStage(
  documents: { id: string; stage_id: string | null; document_type: DocumentType; file_path?: string }[],
  stageNumber: number,
  stageId?: string | null
) {
  return documents.filter((doc) => {
    if (doc.file_path?.includes('/general/')) return false;
    if (stageId && doc.stage_id) {
      return doc.stage_id === stageId;
    }
    if (!doc.stage_id) {
      return DOC_TYPE_PRIMARY_STAGE[doc.document_type] === stageNumber;
    }
    return false;
  });
}
