'use client';

import { useState, useEffect } from 'react';
import { Flame, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { generateWpsRef } from '@/lib/generators';
import type { OrderStage } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface WeldProductionPanelProps {
  stage?: OrderStage;
  orderWps?: string | null;
  jobNumber: string;
  saving: boolean;
  onSaveWps: (wps: string) => void;
}

function normalizeWps(value: string) {
  return value.trim().toUpperCase();
}

function isValidWps(value: string) {
  const v = normalizeWps(value);
  return v.length >= 3 && /^[A-Z0-9][A-Z0-9._/-]*$/.test(v);
}

export function WeldProductionPanel({
  stage,
  orderWps,
  jobNumber,
  saving,
  onSaveWps,
}: WeldProductionPanelProps) {
  const { t } = useI18n();
  const currentWps = stage?.wps_ref ?? orderWps ?? '';
  const suggestedWps = generateWpsRef(jobNumber);
  const [wpsInput, setWpsInput] = useState(currentWps);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setWpsInput(currentWps);
    setTouched(false);
  }, [currentWps]);

  const hasWps = isValidWps(currentWps);
  const isDirty = normalizeWps(wpsInput) !== normalizeWps(currentWps);
  const inputValid = !wpsInput.trim() || isValidWps(wpsInput);

  function applySuggested() {
    setWpsInput(suggestedWps);
    setTouched(true);
  }

  function handleSave() {
    if (!wpsInput.trim() || !isValidWps(wpsInput)) return;
    onSaveWps(normalizeWps(wpsInput));
    setTouched(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-arc-2/30 bg-arc-2/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={16} className="text-arc-2 shrink-0" />
            <span className="font-semibold text-bone text-sm">{t('weldPanel.wpsReference')}</span>
          </div>
          <p className="text-xs text-steel-2">{t('weldPanel.wpsDescLong')}</p>
        </div>
        {hasWps && (
          <span className="inline-flex items-center gap-1 text-xs text-success shrink-0">
            <CheckCircle2 size={14} /> {t('weldPanel.registered')}
          </span>
        )}
      </div>

      <div className="stage-actions">
        <input
          className={`input text-sm font-mono ${
            touched && !inputValid ? 'border-danger' : ''
          }`}
          placeholder={t('weldPanel.placeholder')}
          value={wpsInput}
          disabled={saving}
          onChange={(e) => {
            setWpsInput(e.target.value);
            setTouched(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        <button
          type="button"
          className="btn-secondary text-sm whitespace-nowrap flex items-center justify-center gap-1.5"
          disabled={saving}
          onClick={applySuggested}
        >
          <Sparkles size={14} />
          {t('weldPanel.suggest', { value: suggestedWps })}
        </button>
        {isDirty && (
          <button
            type="button"
            className="btn-primary text-sm whitespace-nowrap"
            disabled={saving || !inputValid || !wpsInput.trim()}
            onClick={handleSave}
          >
            {t('common.save')}
          </button>
        )}
      </div>

      {touched && !inputValid && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertCircle size={12} />
          {t('weldPanel.invalidWps')}
        </p>
      )}
    </div>
  );
}
