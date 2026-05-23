'use client';

import { FileCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getDocumentsForStage } from '@/lib/stages';
import type { OrderDocument, OrderStage } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface MaterialIncomingPanelProps {
  stage?: OrderStage;
  material?: string | null;
  documents: OrderDocument[];
}

export function MaterialIncomingPanel({
  stage,
  material,
  documents,
}: MaterialIncomingPanelProps) {
  const { t } = useI18n();

  const stageDocs = getDocumentsForStage(documents, 2, stage?.id);
  const hasMtc = stageDocs.some(
    (d) => d.document_type === 'mtc' || d.document_type === 'incoming_inspection'
  );
  const hasOperator = !!stage?.operator_name?.trim();

  const checklist = [
    { done: hasOperator, label: t('materialPanel.operatorAssigned') },
    { done: hasMtc, label: t('materialPanel.mtcUploaded') },
  ];

  const readyToComplete = checklist.every((c) => c.done);

  return (
    <div className="mt-3 space-y-3">
      {material && (
        <div className="rounded border border-ink-4 bg-ink-1 px-3 py-2 text-sm">
          <span className="table-head">{t('common.material')}</span>
          <span className="ml-2 font-medium text-bone">{material}</span>
        </div>
      )}

      <div className="rounded border border-ink-4 bg-ink-1 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileCheck size={15} className="text-arc-2" />
            <span className="text-sm font-medium text-bone">{t('materialPanel.checklist')}</span>
          </div>
          {readyToComplete ? (
            <span className="text-xs text-success font-medium">
              {t('materialPanel.checklistComplete')}
            </span>
          ) : (
            <span className="text-xs text-warning font-medium">
              {t('materialPanel.checklistIncomplete')}
            </span>
          )}
        </div>

        <ul className="space-y-1.5">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 size={14} className="text-success shrink-0" />
              ) : (
                <AlertCircle size={14} className="text-warning shrink-0" />
              )}
              <span className={item.done ? 'text-steel-2' : 'text-bone'}>{item.label}</span>
            </li>
          ))}
        </ul>

        {!hasMtc && (
          <p className="text-xs text-steel-2 pt-1">{t('materialPanel.uploadMtcHint')}</p>
        )}
      </div>
    </div>
  );
}
