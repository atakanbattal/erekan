import type {
  CustomerUserRole,
  NdtMethod,
  NdtResult,
  NotificationAudience,
  NotificationType,
  RfqStatus,
} from '@/lib/stages';

export type { CustomerUserRole, NdtMethod, NdtResult, NotificationAudience, NotificationType, RfqStatus };

export interface CustomerUser {
  id: string;
  customer_id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: CustomerUserRole;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PortalNotification {
  id: string;
  audience: NotificationAudience;
  customer_id: string | null;
  order_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface NdtRecord {
  id: string;
  order_id: string;
  stage_id: string | null;
  method: NdtMethod;
  result: NdtResult;
  inspector_name: string | null;
  report_number: string | null;
  notes: string | null;
  is_visible_to_customer: boolean;
  tested_at: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  estimated_arrival: string | null;
  notes: string | null;
  asn_number: string | null;
  package_count: number | null;
  total_weight_kg: number | null;
  delivery_confirmed_at: string | null;
  delivery_confirmed_by: string | null;
  created_at: string;
}

export interface OrderTemplate {
  id: string;
  name: string;
  title_template: string;
  material: string | null;
  standard: string | null;
  description: string | null;
  created_at: string;
}

export interface RfqRequest {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  material: string | null;
  quantity: string | null;
  standard: string | null;
  deadline: string | null;
  status: RfqStatus;
  admin_notes: string | null;
  quote_file_path: string | null;
  quote_file_name: string | null;
  quote_version: number;
  customer_response_note: string | null;
  responded_at: string | null;
  responded_by_name: string | null;
  converted_order_id: string | null;
  created_at: string;
  updated_at: string;
  customers?: Pick<import('@/lib/types').Customer, 'company_name' | 'contact_name' | 'email'>;
  attachments?: RfqAttachment[];
}

export interface RfqAttachment {
  id: string;
  rfq_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: 'customer' | 'admin';
  created_at: string;
}

export interface RfqQuoteVersion {
  id: string;
  rfq_id: string;
  version: number;
  file_path: string;
  file_name: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface TraceabilityLink {
  id: string;
  order_id: string;
  link_type: string;
  heat_number: string | null;
  wps_ref: string | null;
  batch_ref: string | null;
  ndt_record_id: string | null;
  shipment_id: string | null;
  stage_number: number | null;
  notes: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  auth_user_id: string;
  user_type: string;
  notification_type: NotificationType;
  email_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
}

export interface CompanyCertification {
  id: string;
  code: string;
  title: string;
  description: string | null;
  valid_until: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface CustomerContext {
  customerId: string;
  companyName: string;
  contactName: string;
  email: string;
  userRole: CustomerUserRole | 'owner';
  canManageTeam: boolean;
  canUpload: boolean;
}

export type AssetStatus = 'active' | 'under_service' | 'retired';
export type ServiceCaseType = 'warranty' | 'paid_service' | 'consultation';
export type ServiceFaultCategory =
  | 'weld_defect'
  | 'deformation'
  | 'coating'
  | 'assembly'
  | 'wear'
  | 'electrical'
  | 'other';
export type ServicePriority = 'low' | 'normal' | 'high' | 'critical';
export type ServiceCaseStatus =
  | 'submitted'
  | 'triage'
  | 'assigned'
  | 'in_progress'
  | 'waiting_parts'
  | 'resolved'
  | 'closed'
  | 'cancelled';
export type MaintenancePlanStatus = 'active' | 'paused' | 'completed';
export type SparePartStockStatus = 'in_stock' | 'limited' | 'made_to_order' | 'discontinued';
export type SparePartRequestStatus =
  | 'draft'
  | 'submitted'
  | 'quoted'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'shipped'
  | 'cancelled';

export interface CustomerAsset {
  id: string;
  customer_id: string;
  order_id: string | null;
  asset_tag: string;
  serial_number: string | null;
  title: string;
  description: string | null;
  material: string | null;
  standard: string | null;
  location: string | null;
  installed_at: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  warranty_months: number;
  status: AssetStatus;
  access_token: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  orders?: Pick<
    import('@/lib/types').Order,
    'id' | 'job_number' | 'serial_number' | 'status' | 'current_stage' | 'expected_delivery' | 'traceability_token' | 'shipped_at' | 'title'
  >;
  customers?: { company_name: string };
}

export interface ServiceCase {
  id: string;
  customer_id: string;
  asset_id: string;
  case_number: string;
  case_type: ServiceCaseType;
  fault_category: ServiceFaultCategory;
  priority: ServicePriority;
  status: ServiceCaseStatus;
  subject: string;
  description: string;
  operating_conditions: string | null;
  requested_resolution: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  closed_at: string | null;
  customer_confirmed_at: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  customer_assets?: Pick<CustomerAsset, 'asset_tag' | 'title' | 'serial_number'>;
  customers?: Pick<import('@/lib/types').Customer, 'company_name' | 'contact_name'>;
  attachments?: ServiceCaseAttachment[];
  updates?: ServiceCaseUpdate[];
}

export interface ServiceCaseAttachment {
  id: string;
  case_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export interface ServiceCaseUpdate {
  id: string;
  case_id: string;
  author_type: string;
  author_name: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface MaintenancePlan {
  id: string;
  customer_id: string;
  asset_id: string;
  title: string;
  description: string | null;
  interval_days: number;
  checklist: string[];
  next_due_at: string | null;
  last_performed_at: string | null;
  status: MaintenancePlanStatus;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
  customer_assets?: Pick<CustomerAsset, 'asset_tag' | 'title'>;
}

export interface MaintenanceRecord {
  id: string;
  customer_id: string;
  asset_id: string;
  plan_id: string | null;
  performed_at: string;
  performed_by: string | null;
  work_summary: string;
  parts_used: string | null;
  next_due_at: string | null;
  report_file_path: string | null;
  report_file_name: string | null;
  created_at: string;
  customer_assets?: Pick<CustomerAsset, 'asset_tag' | 'title'>;
  maintenance_plans?: Pick<MaintenancePlan, 'title'>;
}

export interface SparePartCatalogItem {
  id: string;
  part_number: string;
  name: string;
  description: string | null;
  drawing_ref: string | null;
  unit: string;
  unit_price: number | null;
  currency: string;
  stock_status: SparePartStockStatus;
  is_active: boolean;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetBomLine {
  id: string;
  asset_id: string;
  part_id: string;
  qty: number;
  recommended_interval_days: number | null;
  notes: string | null;
  spare_part_catalog?: SparePartCatalogItem;
}

export interface SparePartRequest {
  id: string;
  customer_id: string;
  asset_id: string | null;
  request_number: string;
  status: SparePartRequestStatus;
  notes: string | null;
  quote_file_path: string | null;
  quote_file_name: string | null;
  quote_amount: number | null;
  quote_currency: string | null;
  admin_notes: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  customer_assets?: Pick<CustomerAsset, 'asset_tag' | 'title'>;
  customers?: Pick<import('@/lib/types').Customer, 'company_name'>;
  lines?: SparePartRequestLine[];
}

export interface SparePartRequestLine {
  id: string;
  request_id: string;
  part_id: string | null;
  part_number: string;
  part_name: string;
  qty: number;
  unit: string;
  notes: string | null;
}
