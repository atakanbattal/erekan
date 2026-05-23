import { STAGE_STATUS_LABELS, type StageStatus } from './stages';
import { tr } from './i18n/messages/tr';
import { TR_STAGE_TITLES } from './i18n/helpers';
import type { OrderActivity } from './types';
import type { Translator } from './i18n/translator';

export type ActivityVariant = 'document' | 'stage' | 'status' | 'order' | 'field' | 'default';

export interface ResolvedActivity {
  headline: string;
  detail?: string;
  variant: ActivityVariant;
}

const TR_STAGE_BY_TITLE = new Map<string, number>(
  Object.entries(tr.stages).map(([num, s]) => [s.title, Number(num)])
);

const TR_STATUS_BY_LABEL = new Map<string, StageStatus>(
  (Object.entries(STAGE_STATUS_LABELS) as [StageStatus, string][]).map(([key, label]) => [
    label,
    key,
  ])
);

function localizedStageTitle(t: Translator, trTitle: string): string {
  const num = TR_STAGE_BY_TITLE.get(trTitle);
  return num ? t(`stages.${num}.title`) : trTitle;
}

function localizedStageStatus(t: Translator, trStatus: string): string {
  const key = TR_STATUS_BY_LABEL.get(trStatus);
  return key ? t(`stageStatus.${key}`) : trStatus;
}

function docTypeFromFileName(name: string): string | null {
  const match = name.match(/_([A-Z0-9-]+)_\d{8}\./i);
  return match?.[1]?.replace(/-/g, ' ') ?? null;
}

function parseStageStatus(desc: string) {
  const match = desc.match(/^(.+?) → (.+)$/);
  if (!match || !TR_STAGE_TITLES.has(match[1])) return null;
  const statusKey = TR_STATUS_BY_LABEL.get(match[2]);
  if (!statusKey) return null;
  return { stageTr: match[1], statusKey, statusTr: match[2] };
}

export function resolveActivity(
  t: Translator,
  act: OrderActivity,
  isCustomerView: boolean
): ResolvedActivity {
  const desc = (act.description ?? '').trim();
  const action = act.action;

  const docMatch = desc.match(/^(.+?): belge yüklendi — (.+?)(?: \((.+)\))?$/);
  if (docMatch || action === 'document_uploaded') {
    const name =
      docMatch?.[2] ?? (desc.replace(/^Belge yüklendi: /, '') || t('activity.aDocument'));
    const note = docMatch?.[3];
    const typeHint = docTypeFromFileName(name);
    const stageTr = docMatch?.[1];
    return {
      headline: isCustomerView
        ? t('activity.documentHeadline')
        : stageTr
          ? t('activity.documentUploadedStage', { stage: localizedStageTitle(t, stageTr), name })
          : t('activity.documentHeadline'),
      detail: note
        ? `${name} — ${note}`
        : typeHint
          ? `${typeHint} · ${name}`
          : name,
      variant: 'document',
    };
  }

  const stageInfo = parseStageStatus(desc);
  if (stageInfo && action === 'stage_updated') {
    const stage = localizedStageTitle(t, stageInfo.stageTr);
    const status = localizedStageStatus(t, stageInfo.statusTr);
    if (stageInfo.statusKey === 'completed') {
      return {
        headline: t('activity.stageCompletedHeadline', { stage }),
        detail: status,
        variant: 'stage',
      };
    }
    if (stageInfo.statusKey === 'in_progress') {
      return {
        headline: t('activity.stageStartedHeadline', { stage }),
        detail: status,
        variant: 'stage',
      };
    }
    return {
      headline: stage,
      detail: status,
      variant: 'stage',
    };
  }

  const operatorMatch = desc.match(/^(.+?): operatör → (.+)$/);
  if (operatorMatch) {
    const stage = localizedStageTitle(t, operatorMatch[1]);
    return {
      headline: t('activity.operatorAssigned', { stage, operator: operatorMatch[2] }),
      variant: 'field',
    };
  }

  const roleMatch = desc.match(/^(.+?): rol → (.+)$/);
  if (roleMatch) {
    const stage = localizedStageTitle(t, roleMatch[1]);
    return {
      headline: t('activity.roleUpdated', { stage, role: roleMatch[2] }),
      variant: 'field',
    };
  }

  const noteMatch = desc.match(/^(.+?): not eklendi$/);
  if (noteMatch) {
    const stage = localizedStageTitle(t, noteMatch[1]);
    return {
      headline: t('activity.noteAdded', { stage }),
      variant: 'field',
    };
  }

  const wpsMatch = desc.match(/^Kaynak: WPS → (.+)$/);
  if (wpsMatch) {
    return {
      headline: t('activity.wpsUpdated', { wps: wpsMatch[1] }),
      variant: 'field',
    };
  }

  if (action === 'order_created') {
    const jobMatch = desc.match(/Sipariş (?:açıldı|oluşturuldu): (.+)/);
    return {
      headline: isCustomerView ? t('activity.orderCreatedCustomer') : t('activity.orderCreated'),
      detail: jobMatch?.[1],
      variant: 'order',
    };
  }

  if (action === 'status_changed') {
    const statusMatch = desc.match(/Durum güncellendi: (.+)$/) ?? desc.match(/→ (.+)$/);
    return {
      headline: isCustomerView ? t('activity.orderStatusCustomer') : t('activity.orderStatusHeadline'),
      detail: statusMatch?.[1] ?? desc,
      variant: 'status',
    };
  }

  if (desc.includes('undefined')) {
    if (action === 'stage_updated') {
      return { headline: t('activity.stageUpdatedGeneric'), variant: 'stage' };
    }
    if (action === 'document_uploaded') {
      return { headline: t('activity.documentHeadline'), variant: 'document' };
    }
  }

  return { headline: desc || t('activity.genericUpdate'), variant: 'default' };
}

/** Chronological feed — only removes exact duplicate log lines. */
export function prepareActivityFeed(
  activities: OrderActivity[],
  limit?: number
): OrderActivity[] {
  const sorted = [...activities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const seen = new Set<string>();
  const result: OrderActivity[] = [];

  for (const act of sorted) {
    const minute = act.created_at.slice(0, 16);
    const key = `${act.action}|${act.description ?? ''}|${act.actor_name ?? ''}|${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(act);
    if (limit != null && result.length >= limit) break;
  }

  return result;
}

export const ACTIVITY_VARIANT_STYLES: Record<
  ActivityVariant,
  { icon: string; node: string; badge: string; text: string }
> = {
  document: {
    icon: 'text-arc-2',
    node: 'activity-feed-node--document',
    badge: 'activity-feed-badge--document',
    text: 'text-bone',
  },
  stage: {
    icon: 'text-success',
    node: 'activity-feed-node--stage',
    badge: 'activity-feed-badge--stage',
    text: 'text-bone',
  },
  status: {
    icon: 'text-warning',
    node: 'activity-feed-node--status',
    badge: 'activity-feed-badge--status',
    text: 'text-bone',
  },
  order: {
    icon: 'text-arc-3',
    node: 'activity-feed-node--order',
    badge: 'activity-feed-badge--order',
    text: 'text-bone',
  },
  field: {
    icon: 'text-steel-2',
    node: 'activity-feed-node--default',
    badge: 'activity-feed-badge--default',
    text: 'text-bone',
  },
  default: {
    icon: 'text-steel-2',
    node: 'activity-feed-node--default',
    badge: 'activity-feed-badge--default',
    text: 'text-steel-3',
  },
};
