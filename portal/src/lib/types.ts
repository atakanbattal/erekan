import type { DocumentType, OrderStatus, StageStatus } from './stages';

export interface Customer {
  id: string;
  auth_user_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StaffProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: string;
  is_admin: boolean;
}

export interface Order {
  id: string;
  customer_id: string;
  job_number: string;
  serial_number: string | null;
  title: string;
  description: string | null;
  material: string | null;
  quantity: string | null;
  standard: string | null;
  status: OrderStatus;
  current_stage: number;
  heat_number: string | null;
  wps_ref: string | null;
  expected_delivery: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
}

export interface OrderStage {
  id: string;
  order_id: string;
  stage_number: number;
  stage_code: string;
  title: string;
  status: StageStatus;
  operator_name: string | null;
  operator_role: string | null;
  heat_number: string | null;
  wps_ref: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface OrderDocument {
  id: string;
  order_id: string;
  stage_id: string | null;
  name: string;
  document_type: DocumentType;
  file_path: string;
  file_size: number | null;
  mime_type: string;
  description: string | null;
  is_visible_to_customer: boolean;
  created_at: string;
}

export interface OrderActivity {
  id: string;
  order_id: string;
  stage_id: string | null;
  action: string;
  description: string | null;
  actor_name: string | null;
  actor_role: string | null;
  created_at: string;
}
