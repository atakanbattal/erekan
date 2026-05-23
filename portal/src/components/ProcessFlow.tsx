'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Check, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { OrderStage } from '@/lib/types';
import type { StageStatus } from '@/lib/stages';
import { useI18n } from '@/lib/i18n/context';
import { getLocalizedStages } from '@/lib/i18n/helpers';

interface ProcessFlowProps {
  stages: OrderStage[];
  currentStage: number;
  orderHref?: string;
  expectedDelivery?: string | null;
  compact?: boolean;
}

const STAGE_COLORS = [
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#6366f1',
];

function nodeState(
  status: StageStatus,
  stageNumber: number,
  currentStage: number
): 'completed' | 'current' | 'upcoming' {
  if (status === 'completed' || status === 'skipped') return 'completed';
  if (status === 'in_progress' || stageNumber === currentStage) return 'current';
  if (stageNumber < currentStage) return 'completed';
  return 'upcoming';
}

export function ProcessFlow({
  stages,
  currentStage,
  orderHref,
  expectedDelivery,
  compact = false,
}: ProcessFlowProps) {
  const { t, dateLocale } = useI18n();
  const stageDefs = getLocalizedStages(t);
  const stageMap = new Map(stages.map((s) => [s.stage_number, s]));

  return (
    <div className="process-flow">
      <div className={`process-flow-track ${compact ? 'process-flow-track--compact' : ''}`}>
        {stageDefs.map((def, index) => {
          const stage = stageMap.get(def.number);
          const status: StageStatus = stage?.status ?? 'pending';
          const state = nodeState(status, def.number, currentStage);
          const color = STAGE_COLORS[index] ?? STAGE_COLORS[0];
          const isLast = index === stageDefs.length - 1;

          return (
            <div key={def.number} className="process-flow-step">
              <div className="process-flow-node-wrap">
                <div
                  className={`process-flow-node process-flow-node--${state}`}
                  style={
                    state !== 'upcoming'
                      ? ({ '--step-color': color } as CSSProperties)
                      : undefined
                  }
                  title={def.title}
                >
                  {state === 'completed' ? (
                    <Check size={compact ? 14 : 16} strokeWidth={3} />
                  ) : state === 'current' ? (
                    <Clock size={compact ? 14 : 16} />
                  ) : (
                    <Circle size={compact ? 10 : 12} />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`process-flow-connector ${
                      state === 'completed' ? 'process-flow-connector--done' : ''
                    }`}
                    style={
                      state === 'completed'
                        ? ({ '--step-color': color } as CSSProperties)
                        : undefined
                    }
                  />
                )}
              </div>
              {!compact && (
                <div className="process-flow-label">
                  <span
                    className={`process-flow-label-text ${
                      state === 'current' ? 'process-flow-label-text--current' : ''
                    }`}
                  >
                    {def.title}
                  </span>
                  {state === 'current' && (
                    <span className="process-flow-label-badge">{t('processFlow.inProgress')}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="process-flow-footer">
          <div className="process-flow-meta">
            <span className="process-flow-meta-label">{t('processFlow.currentStep')}</span>
            <span className="process-flow-meta-value">
              {stageDefs.find((s) => s.number === currentStage)?.title}
            </span>
            <span className="process-flow-meta-step">
              {t('processFlow.stepOf', { current: currentStage, total: 7 })}
            </span>
          </div>
          {expectedDelivery && (
            <div className="process-flow-meta">
              <span className="process-flow-meta-label">{t('processFlow.estimatedDelivery')}</span>
              <span className="process-flow-meta-value">
                {format(new Date(expectedDelivery), 'd MMM yyyy', { locale: dateLocale })}
              </span>
            </div>
          )}
          {orderHref && (
            <Link href={orderHref} className="btn-primary text-sm process-flow-cta">
              {t('processFlow.viewDetails')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
