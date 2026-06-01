'use client';

import { useI18n } from '@/lib/i18n/context';

type BadgeKind =
  | 'asset'
  | 'service'
  | 'maintenance'
  | 'parts'
  | 'priority'
  | 'stock';

const TONE: Record<string, string> = {
  active: 'bg-success/10 text-success',
  under_service: 'bg-warning/10 text-warning',
  retired: 'bg-ink-2 text-steel-2',
  submitted: 'bg-blue-500/10 text-blue-600',
  triage: 'bg-warning/10 text-warning',
  assigned: 'bg-purple-500/10 text-purple-600',
  in_progress: 'bg-blue-500/10 text-blue-600',
  waiting_parts: 'bg-warning/10 text-warning',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-ink-2 text-steel-2',
  cancelled: 'bg-ink-2 text-steel-2',
  draft: 'bg-ink-2 text-steel-2',
  quoted: 'bg-purple-500/10 text-purple-600',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  ordered: 'bg-blue-500/10 text-blue-600',
  shipped: 'bg-success/10 text-success',
  paused: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  low: 'bg-ink-2 text-steel-2',
  normal: 'bg-blue-500/10 text-blue-600',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-danger/10 text-danger',
  in_stock: 'bg-success/10 text-success',
  limited: 'bg-warning/10 text-warning',
  made_to_order: 'bg-blue-500/10 text-blue-600',
  discontinued: 'bg-ink-2 text-steel-2',
};

interface AftermarketStatusBadgeProps {
  kind: BadgeKind;
  value: string;
}

export function AftermarketStatusBadge({ kind, value }: AftermarketStatusBadgeProps) {
  const { t } = useI18n();
  const label = t(`aftermarket.${kind}Status.${value}`);
  const tone = TONE[value] ?? 'bg-ink-2 text-steel-2';

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold whitespace-nowrap ${tone}`}
    >
      {label}
    </span>
  );
}
