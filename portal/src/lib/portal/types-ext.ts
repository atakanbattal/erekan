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
