'use client';

import { Check, Circle, Clock, SkipForward } from 'lucide-react';
import { format } from 'date-fns';
import type { OrderDocument, OrderStage } from '@/lib/types';
import { type StageStatus } from '@/lib/stages';
import { StageDocumentSection } from './StageDocumentSection';
import { useI18n } from '@/lib/i18n/context';
import { getLocalizedStages, getStageStatusLabel } from '@/lib/i18n/helpers';

interface TimelineProps {
  stages: OrderStage[];
  currentStage: number;
  documents?: OrderDocument[];
  orderId?: string;
  jobNumber?: string;
  interactive?: boolean;
  onStageClick?: (stageNumber: number) => void;
}

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case 'completed':
      return <Check size={16} className="text-ink-0" />;
    case 'in_progress':
      return <Clock size={16} className="text-ink-0" />;
    case 'skipped':
      return <SkipForward size={16} className="text-steel-2" />;
    default:
      return <Circle size={12} className="text-steel-1" />;
  }
}

function stageCircleClass(status: StageStatus, isCurrent: boolean) {
  if (status === 'completed') return 'bg-success border-success';
  if (status === 'in_progress' || isCurrent) return 'bg-arc-2 border-arc-2 shadow-[0_0_12px_rgba(255,122,26,0.4)]';
  if (status === 'skipped') return 'bg-ink-5 border-ink-6';
  return 'bg-ink-3 border-ink-5';
}

export function Timeline({
  stages,
  currentStage,
  documents = [],
  orderId,
  jobNumber,
  interactive = false,
  onStageClick,
}: TimelineProps) {
  const { t, dateLocale } = useI18n();
  const stageDefs = getLocalizedStages(t);
  const stageMap = new Map(stages.map((s) => [s.stage_number, s]));

  return (
    <div className="space-y-0">
      {stageDefs.map((def, index) => {
        const stage = stageMap.get(def.number);
        const status: StageStatus = stage?.status ?? 'pending';
        const isCurrent = def.number === currentStage;
        const isLast = index === stageDefs.length - 1;

        return (
          <div key={def.number} className="flex gap-4">
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onStageClick?.(def.number)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${stageCircleClass(status, isCurrent)} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
              >
                <StageIcon status={status} />
              </button>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[40px] ${
                    status === 'completed' ? 'bg-success/50' : 'bg-ink-5'
                  }`}
                />
              )}
            </div>

            <div className={`pb-8 flex-1 min-w-0 ${isCurrent ? 'opacity-100' : 'opacity-80'}`}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="eyebrow text-xs">
                  {String(def.number).padStart(2, '0')} · {def.code}
                </span>
                <span
                  className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    status === 'in_progress'
                      ? 'bg-arc-2/20 text-arc-3'
                      : status === 'completed'
                        ? 'bg-success/15 text-success'
                        : 'bg-ink-4 text-steel-2'
                  }`}
                >
                  {getStageStatusLabel(t, status)}
                </span>
              </div>

              <h4
                className={`font-bold mb-1 ${isCurrent ? 'text-bone text-lg' : 'text-steel-3'}`}
              >
                {def.title}
              </h4>

              <p className="text-sm text-steel-2 mb-2 max-w-lg">{def.description}</p>

              {stage && (stage.operator_name || stage.completed_at || stage.started_at || stage.heat_number || stage.wps_ref) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 p-3 bg-ink-3 rounded border border-ink-4">
                  {stage.operator_name && (
                    <div>
                      <div className="label text-[10px]">{t('timeline.operator')}</div>
                      <div className="text-sm text-bone">{stage.operator_name}</div>
                      {stage.operator_role && (
                        <div className="text-xs text-steel-2">{stage.operator_role}</div>
                      )}
                    </div>
                  )}
                  {stage.heat_number && (
                    <div>
                      <div className="label text-[10px]">{t('common.heatNumber')}</div>
                      <div className="text-sm font-mono text-bone">{stage.heat_number}</div>
                    </div>
                  )}
                  {stage.wps_ref && stage.wps_ref !== '—' && (
                    <div>
                      <div className="label text-[10px]">{t('timeline.wps')}</div>
                      <div className="text-sm font-mono text-bone">{stage.wps_ref}</div>
                    </div>
                  )}
                  {(stage.completed_at || stage.started_at) && (
                    <div>
                      <div className="label text-[10px]">{t('timeline.date')}</div>
                      <div className="text-sm font-mono text-bone">
                        {format(
                          new Date(stage.completed_at || stage.started_at!),
                          'd MMM yyyy',
                          { locale: dateLocale }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {stage?.notes && (
                <p className="mt-2 text-sm text-steel-3 italic border-l-2 border-arc-2/40 pl-3">
                  {stage.notes}
                </p>
              )}

              {orderId && jobNumber && (
                <div className="mt-3">
                  <StageDocumentSection
                    mode="customer"
                    orderId={orderId}
                    jobNumber={jobNumber}
                    stageNumber={def.number}
                    stageId={stage?.id}
                    stageTitle={def.title}
                    documents={documents}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
