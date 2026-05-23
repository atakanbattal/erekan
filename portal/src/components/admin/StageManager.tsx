'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { OrderDocument, OrderStage } from '@/lib/types';
import { PRODUCTION_STAGES, STAGE_STATUS_LABELS, type StageStatus } from '@/lib/stages';
import { MaterialIncomingPanel } from './MaterialIncomingPanel';
import { WeldProductionPanel } from './WeldProductionPanel';
import { StageDocumentSection } from '../StageDocumentSection';
import { useI18n } from '@/lib/i18n/context';
import { getLocalizedStages, getStageStatusLabel } from '@/lib/i18n/helpers';

interface StageManagerProps {
  orderId: string;
  jobNumber: string;
  material?: string | null;
  documents: OrderDocument[];
  stages: OrderStage[];
  currentStage: number;
  staffName: string;
  orderHeat?: string | null;
  orderWps?: string | null;
  onDocumentsChange?: () => void;
}

type FieldKey = 'operator_name' | 'operator_role' | 'notes' | 'heat_number' | 'wps_ref';

function fieldCacheKey(stageNumber: number, field: FieldKey) {
  return `${stageNumber}:${field}`;
}

export function StageManager({
  orderId,
  jobNumber,
  material,
  documents,
  stages,
  currentStage,
  staffName,
  orderHeat,
  orderWps,
  onDocumentsChange,
}: StageManagerProps) {
  const { t } = useI18n();
  const stageDefs = getLocalizedStages(t);
  const [saving, setSaving] = useState<number | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const stageMap = new Map(stages.map((s) => [s.stage_number, s]));
  const persistedRef = useRef<Record<string, string>>({});
  const lastLogRef = useRef<Record<string, number>>({});
  const busyRef = useRef(false);

  useEffect(() => {
    for (const stage of stages) {
      persistedRef.current[fieldCacheKey(stage.stage_number, 'operator_name')] =
        stage.operator_name ?? '';
      persistedRef.current[fieldCacheKey(stage.stage_number, 'operator_role')] =
        stage.operator_role ?? '';
      persistedRef.current[fieldCacheKey(stage.stage_number, 'notes')] = stage.notes ?? '';
      persistedRef.current[fieldCacheKey(stage.stage_number, 'heat_number')] =
        stage.heat_number ?? '';
      persistedRef.current[fieldCacheKey(stage.stage_number, 'wps_ref')] = stage.wps_ref ?? '';
    }
    if (orderHeat) {
      persistedRef.current[fieldCacheKey(2, 'heat_number')] = orderHeat;
    }
    if (orderWps) {
      persistedRef.current[fieldCacheKey(4, 'wps_ref')] = orderWps;
    }
  }, [stages, orderHeat, orderWps]);

  async function logActivity(description: string) {
    const now = Date.now();
    const last = lastLogRef.current[description];
    if (last && now - last < 8000) return;

    lastLogRef.current[description] = now;
    await supabase.from('order_activity').insert({
      order_id: orderId,
      action: 'stage_updated',
      description,
      actor_name: staffName,
    });
  }

  async function syncOrderTraceability(heat?: string | null, wps?: string | null) {
    const updates: Record<string, string> = {};
    if (heat) updates.heat_number = heat;
    if (wps) updates.wps_ref = wps;
    if (Object.keys(updates).length) {
      await supabase.from('orders').update(updates).eq('id', orderId);
    }
  }

  async function persistStage(
    stageNumber: number,
    updates: Partial<OrderStage>,
    options?: { logMsg?: string; refresh?: boolean }
  ) {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(stageNumber);

    const existing = stageMap.get(stageNumber);
    const def = PRODUCTION_STAGES.find((s) => s.number === stageNumber)!;

    if (existing) {
      await supabase.from('order_stages').update(updates).eq('id', existing.id);
    } else {
      await supabase.from('order_stages').insert({
        order_id: orderId,
        stage_number: stageNumber,
        stage_code: def.code,
        title: def.title,
        ...updates,
      });
    }

    if (options?.logMsg) {
      await logActivity(options.logMsg);
    }

    setSaving(null);
    busyRef.current = false;

    if (options?.refresh) {
      router.refresh();
    }
  }

  async function updateStageStatus(stageNumber: number, status: StageStatus, stage?: OrderStage) {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(stageNumber);

    const existing = stageMap.get(stageNumber);
    const def = PRODUCTION_STAGES.find((s) => s.number === stageNumber)!;
    const updates: Partial<OrderStage> = {
      status,
      ...(status === 'in_progress' && !stage?.started_at
        ? { started_at: new Date().toISOString() }
        : {}),
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    };

    if (existing) {
      await supabase.from('order_stages').update(updates).eq('id', existing.id);
    } else {
      await supabase.from('order_stages').insert({
        order_id: orderId,
        stage_number: stageNumber,
        stage_code: def.code,
        title: def.title,
        ...updates,
      });
    }

    if (status === 'in_progress') {
      await supabase.from('orders').update({ current_stage: stageNumber }).eq('id', orderId);
    }
    if (status === 'completed' && stageNumber < 7) {
      await supabase.from('orders').update({ current_stage: stageNumber + 1 }).eq('id', orderId);
    }
    if (status === 'completed' && stageNumber === 7) {
      await supabase
        .from('orders')
        .update({ status: 'completed', current_stage: 7 })
        .eq('id', orderId);
    }

    await logActivity(
      `${def.title} → ${STAGE_STATUS_LABELS[status] ?? status}`
    );

    setSaving(null);
    busyRef.current = false;
    router.refresh();
  }

  async function saveField(
    stageNumber: number,
    field: FieldKey,
    value: string,
    logMsg?: string
  ) {
    const cacheKey = fieldCacheKey(stageNumber, field);
    const normalized = value.trim();
    if (normalized === (persistedRef.current[cacheKey] ?? '')) return;

    persistedRef.current[cacheKey] = normalized;

    const updates: Partial<OrderStage> = { [field]: normalized || null };
    await persistStage(stageNumber, updates, logMsg ? { logMsg } : undefined);

    if (stageNumber === 2 && field === 'heat_number' && normalized) {
      await syncOrderTraceability(normalized, undefined);
    }
    if (stageNumber === 4 && field === 'wps_ref' && normalized) {
      await syncOrderTraceability(undefined, normalized);
    }
  }

  return (
    <div className="space-y-3">
      {stageDefs.map((def) => {
        const dbDef = PRODUCTION_STAGES.find((s) => s.number === def.number)!;
        const stage = stageMap.get(def.number);
        const status: StageStatus = stage?.status ?? 'pending';
        const isCurrent = def.number === currentStage;
        const isMaterialStage = def.number === 2;
        const isWeldStage = def.number === 4;

        return (
          <div
            key={def.number}
            className={`stage-card card p-4 sm:p-5 ${isCurrent ? 'border-arc-2/50 ring-1 ring-arc-2/20' : ''}`}
          >
            <div className="mb-4 pb-4 border-b border-ink-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="stage-badge">{String(def.number).padStart(2, '0')}</span>
                <span className="stage-code">{def.code}</span>
              </div>

              <div>
                <h4 className="font-bold text-bone text-base leading-snug">{def.title}</h4>
                {(isMaterialStage || isWeldStage) && (
                  <p className="text-xs text-steel-2 mt-1.5 leading-relaxed">{def.description}</p>
                )}
              </div>

              <div className="max-w-xs">
                <label className="table-head block mb-1.5">{t('stageManager.stageStatus')}</label>
                <select
                  className="input text-sm w-full"
                  value={status}
                  disabled={saving === def.number}
                  onChange={(e) =>
                    updateStageStatus(def.number, e.target.value as StageStatus, stage)
                  }
                >
                  {(['pending', 'in_progress', 'completed', 'skipped'] as StageStatus[]).map((key) => (
                    <option key={key} value={key}>{getStageStatusLabel(t, key)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="stage-section">
              <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="input text-sm"
                placeholder={t('stageManager.operatorName')}
                defaultValue={stage?.operator_name ?? ''}
                disabled={saving === def.number}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (!val) return;
                  saveField(
                    def.number,
                    'operator_name',
                    val,
                    `${dbDef.title}: operatör → ${val}`
                  );
                }}
              />
              <input
                className="input text-sm"
                placeholder={isMaterialStage ? t('stageManager.roleMaterial') : t('stageManager.roleDefault')}
                defaultValue={stage?.operator_role ?? ''}
                disabled={saving === def.number}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (!val) return;
                  saveField(
                    def.number,
                    'operator_role',
                    val,
                    `${dbDef.title}: rol → ${val}`
                  );
                }}
              />
            </div>

            {isMaterialStage && (
              <MaterialIncomingPanel
                stage={stage}
                material={material}
                documents={documents}
              />
            )}

            {isWeldStage && (
              <WeldProductionPanel
                stage={stage}
                orderWps={orderWps}
                jobNumber={jobNumber}
                saving={saving === def.number}
                onSaveWps={(wps) =>
                  saveField(def.number, 'wps_ref', wps, `Kaynak: WPS → ${wps}`)
                }
              />
            )}

            <textarea
              className="input text-sm min-h-[72px] resize-y"
              placeholder={
                isMaterialStage
                  ? t('stageManager.notesMaterial')
                  : t('stageManager.notesDefault')
              }
              defaultValue={stage?.notes ?? ''}
              disabled={saving === def.number}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (!val) return;
                saveField(def.number, 'notes', val, `${dbDef.title}: not eklendi`);
              }}
            />

            {saving === def.number && (
              <div className="flex items-center gap-2 text-xs text-arc-2">
                <Save size={12} /> {t('common.saving')}
              </div>
            )}

            <StageDocumentSection
              mode="admin"
              orderId={orderId}
              jobNumber={jobNumber}
              stageNumber={def.number}
              stageId={stage?.id}
              stageTitle={def.title}
              documents={documents}
              staffName={staffName}
              onUploaded={onDocumentsChange}
            />
            </div>
          </div>
        );
      })}
    </div>
  );
}
