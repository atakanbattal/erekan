'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketNav } from '@/components/aftermarket/AftermarketNav';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { btnPrimary, btnSecondary } from '@/components/aftermarket/ui';
import { getAftermarketFileUrl } from '@/lib/aftermarket/uploads';
import type { ServiceCase, ServiceCaseStatus } from '@/lib/portal/types-ext';

interface ServiceCaseDetailClientProps {
  serviceCase: ServiceCase;
  basePath?: string;
  isAdmin?: boolean;
  staffName?: string;
}

const ADMIN_STATUSES: ServiceCaseStatus[] = [
  'submitted', 'triage', 'assigned', 'in_progress', 'waiting_parts', 'resolved', 'closed', 'cancelled',
];

export function ServiceCaseDetailClient({
  serviceCase,
  basePath = '/aftermarket',
  isAdmin = false,
  staffName = '',
}: ServiceCaseDetailClientProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState(serviceCase.status);
  const [assignedTo, setAssignedTo] = useState(serviceCase.assigned_to ?? '');
  const [resolutionNotes, setResolutionNotes] = useState(serviceCase.resolution_notes ?? '');
  const [updateBody, setUpdateBody] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [saving, setSaving] = useState(false);

  async function downloadAttachment(path: string, name: string) {
    const url = await getAftermarketFileUrl(path);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }

  async function addUpdate() {
    if (!updateBody.trim()) return;
    setSaving(true);
    await supabase.from('service_case_updates').insert({
      case_id: serviceCase.id,
      author_type: isAdmin ? 'staff' : 'customer',
      author_name: isAdmin ? staffName : serviceCase.created_by_name,
      body: updateBody.trim(),
      is_internal: isAdmin && internalNote,
    });
    setUpdateBody('');
    setSaving(false);
    router.refresh();
  }

  async function saveAdminFields() {
    if (!isAdmin) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      status,
      assigned_to: assignedTo || null,
      resolution_notes: resolutionNotes || null,
      updated_at: new Date().toISOString(),
    };
    if (status === 'closed' || status === 'cancelled') {
      payload.closed_at = new Date().toISOString();
    }
    await supabase.from('service_cases').update(payload).eq('id', serviceCase.id);

    try {
      await fetch('/api/aftermarket/service/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: serviceCase.id, caseNumber: serviceCase.case_number, updated: true }),
      });
    } catch {
      // best effort
    }

    setSaving(false);
    router.refresh();
  }

  async function confirmResolution() {
    if (isAdmin || serviceCase.status !== 'resolved') return;
    setSaving(true);
    await supabase
      .from('service_cases')
      .update({
        status: 'closed',
        customer_confirmed_at: new Date().toISOString(),
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceCase.id);
    setSaving(false);
    router.refresh();
  }

  const visibleUpdates = (serviceCase.updates ?? []).filter((u) => !u.is_internal || isAdmin);

  return (
    <div className="flex flex-col gap-5">
      <AftermarketNav basePath={basePath} />

      <Link href={`${basePath}/service`} className="inline-flex items-center gap-1 text-sm text-steel-2 hover:text-bone">
        <ChevronLeft size={16} className="shrink-0" aria-hidden />
        {t('aftermarket.backToService')}
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-sm text-arc-2">{serviceCase.case_number}</div>
            <h1 className="text-2xl font-black text-bone mt-1">{serviceCase.subject}</h1>
            <p className="text-sm text-steel-2 mt-1">
              {serviceCase.customer_assets?.title ?? serviceCase.customer_assets?.asset_tag}
            </p>
          </div>
          <AftermarketStatusBadge kind="service" value={serviceCase.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div>
            <div className="label">{t('aftermarket.service.caseType')}</div>
            <div className="text-bone font-medium">{t(`aftermarket.serviceType.${serviceCase.case_type}`)}</div>
          </div>
          <div>
            <div className="label">{t('aftermarket.service.faultCategory')}</div>
            <div className="text-bone font-medium">{t(`aftermarket.faultCategory.${serviceCase.fault_category}`)}</div>
          </div>
          <div>
            <div className="label">{t('aftermarket.service.priority')}</div>
            <AftermarketStatusBadge kind="priority" value={serviceCase.priority} />
          </div>
          <div>
            <div className="label">{t('common.status')}</div>
            <div className="text-bone font-medium">
              {format(new Date(serviceCase.created_at), 'dd MMM yyyy', { locale: dateLocale })}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="label">{t('aftermarket.service.description')}</div>
            <p className="text-sm text-steel-2 whitespace-pre-wrap">{serviceCase.description}</p>
          </div>
          {serviceCase.operating_conditions && (
            <div>
              <div className="label">{t('aftermarket.service.operatingConditions')}</div>
              <p className="text-sm text-steel-2 whitespace-pre-wrap">{serviceCase.operating_conditions}</p>
            </div>
          )}
          {serviceCase.requested_resolution && (
            <div>
              <div className="label">{t('aftermarket.service.requestedResolution')}</div>
              <p className="text-sm text-steel-2">{t(`aftermarket.resolution.${serviceCase.requested_resolution}`)}</p>
            </div>
          )}
        </div>

        {(serviceCase.attachments ?? []).length > 0 && (
          <div className="mt-6">
            <div className="label mb-2">{t('aftermarket.service.attachments')}</div>
            <ul className="space-y-2">
              {serviceCase.attachments!.map((att) => (
                <li key={att.id}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-arc-2"
                    onClick={() => downloadAttachment(att.file_path, att.file_name)}
                  >
                    <Download size={14} className="shrink-0" aria-hidden />
                    {att.file_name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isAdmin && serviceCase.status === 'resolved' && !serviceCase.customer_confirmed_at && (
          <div className="mt-6 rounded-lg border border-ink-4 bg-ink-2 p-4">
            <p className="mb-3 text-sm text-bone">{t('aftermarket.service.confirmPrompt')}</p>
            <button type="button" className={btnPrimary} disabled={saving} onClick={confirmResolution}>
              {t('aftermarket.service.confirmClose')}
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="mt-6 space-y-4 rounded-lg border border-ink-4 bg-ink-2 p-4">
            <h3 className="font-bold text-bone">{t('aftermarket.admin.manageCase')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('common.status')}</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ServiceCaseStatus)}>
                  {ADMIN_STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`aftermarket.serviceStatus.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('aftermarket.admin.assignedTo')}</label>
                <input className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">{t('aftermarket.admin.resolutionNotes')}</label>
              <textarea className="input min-h-[80px]" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
            </div>
            <button type="button" className={btnPrimary} disabled={saving} onClick={saveAdminFields}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-bold text-bone">{t('aftermarket.service.timeline')}</h2>
        <ul className="m-0 list-none space-y-4 border-l-2 border-ink-4 pl-4">
          {visibleUpdates.map((u) => (
            <li key={u.id} className="relative">
              <span className="absolute -left-[calc(0.625rem+1px)] top-1.5 block h-2 w-2 rounded-full bg-arc-2" aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-bone">{u.author_name ?? u.author_type}</span>
                <span className="text-xs text-steel-2">
                  {format(new Date(u.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
                </span>
                {u.is_internal && (
                  <span className="inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                    {t('aftermarket.admin.internal')}
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-steel-2">{u.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2">
          <textarea
            className="input min-h-[80px]"
            placeholder={t('aftermarket.service.addUpdate')}
            value={updateBody}
            onChange={(e) => setUpdateBody(e.target.value)}
          />
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-steel-2">
              <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
              {t('aftermarket.admin.internalNote')}
            </label>
          )}
          <button type="button" className={btnSecondary} disabled={saving || !updateBody.trim()} onClick={addUpdate}>
            {t('aftermarket.service.postUpdate')}
          </button>
        </div>
      </div>
    </div>
  );
}
