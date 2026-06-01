import type { NotificationType } from '@/lib/stages';

export const NOTIFICATION_TYPES_FOR_PREFS: NotificationType[] = [
  'stage_changed',
  'document_uploaded',
  'quote_ready',
  'shipment_updated',
  'ndt_result',
  'delivery_overdue',
  'message_reply',
  'rfq_approved',
  'rfq_rejected',
  'delivery_confirmed',
  'service_case_submitted',
  'service_case_updated',
  'maintenance_due',
  'spare_part_quoted',
];

export async function shouldSendNotification(
  admin: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { eq: (col2: string, val2: NotificationType) => { maybeSingle: () => Promise<{ data: { email_enabled?: boolean; in_app_enabled?: boolean } | null }> } } } } },
  authUserId: string,
  type: NotificationType,
  channel: 'email' | 'in_app'
): Promise<boolean> {
  const { data } = await admin
    .from('notification_preferences')
    .select('email_enabled, in_app_enabled')
    .eq('auth_user_id', authUserId)
    .eq('notification_type', type)
    .maybeSingle();

  if (!data) return true;
  return channel === 'email' ? data.email_enabled !== false : data.in_app_enabled !== false;
}
