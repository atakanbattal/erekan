import type { StaffRole } from '@/lib/stages';

export type StaffPermission =
  | 'manage_orders'
  | 'manage_customers'
  | 'manage_rfq'
  | 'manage_quality'
  | 'view_audit'
  | 'manage_templates';

const ROLE_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  admin: [
    'manage_orders',
    'manage_customers',
    'manage_rfq',
    'manage_quality',
    'view_audit',
    'manage_templates',
  ],
  operations: ['manage_orders', 'manage_rfq', 'manage_quality'],
  quality: ['manage_orders', 'manage_quality'],
  sales: ['manage_customers', 'manage_rfq'],
};

export function staffHasPermission(
  role: StaffRole | null | undefined,
  isAdmin: boolean,
  permission: StaffPermission
): boolean {
  if (isAdmin) return true;
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
