import type { ActivityBadgeVariant } from '@/lib/portal/activity-status';

interface ActivityStatusBadgeProps {
  label: string;
  variant: ActivityBadgeVariant;
  dot?: boolean;
}

const VARIANT_CLASS: Record<ActivityBadgeVariant, string> = {
  unread: 'activity-status-badge--unread',
  awaiting: 'activity-status-badge--awaiting',
  answered: 'activity-status-badge--answered',
  action: 'activity-status-badge--action',
  pending: 'activity-status-badge--pending',
  success: 'activity-status-badge--success',
  danger: 'activity-status-badge--danger',
  muted: 'activity-status-badge--muted',
};

export function ActivityStatusBadge({ label, variant, dot }: ActivityStatusBadgeProps) {
  return (
    <span className={`activity-status-badge ${VARIANT_CLASS[variant]}`}>
      {dot && <span className="activity-status-badge-dot" aria-hidden />}
      {label}
    </span>
  );
}
