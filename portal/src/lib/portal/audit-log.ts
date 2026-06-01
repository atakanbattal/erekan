import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditLogInput {
  actorType: 'staff' | 'customer' | 'system';
  actorId?: string | null;
  actorName?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
}

export async function writeAuditLog(input: AuditLogInput) {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_log').insert({
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    details: input.details ?? null,
  });

  if (error) {
    console.error('Audit log failed:', error.message);
  }
}
