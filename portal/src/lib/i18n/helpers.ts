import { PRODUCTION_STAGES } from '@/lib/stages';
import type { DocumentType, OrderStatus, StageStatus } from '@/lib/stages';
import { tr } from './messages/tr';
import type { Translator } from './translator';

export function getLocalizedStages(t: Translator) {
  return PRODUCTION_STAGES.map((stage) => ({
    ...stage,
    title: t(`stages.${stage.number}.title`),
    description: t(`stages.${stage.number}.description`),
  }));
}

export function getOrderStatusLabel(t: Translator, status: OrderStatus) {
  return t(`orderStatus.${status}`);
}

export function getStageStatusLabel(t: Translator, status: StageStatus) {
  return t(`stageStatus.${status}`);
}

export function getDocTypeLabel(t: Translator, type: DocumentType) {
  return t(`docTypes.${type}`);
}

/** Turkish stage titles for activity log orphan detection (DB logs are in Turkish). */
export const TR_STAGE_TITLES = new Set<string>(
  Object.values(tr.stages).map((s) => s.title)
);
