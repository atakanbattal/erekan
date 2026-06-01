'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketNav } from '@/components/aftermarket/AftermarketNav';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { btnPrimary, btnSecondary, filterTabClass } from '@/components/aftermarket/ui';
import { FileAttachmentPicker } from '@/components/portal/FileAttachments';
import { uploadAftermarketFile } from '@/lib/aftermarket/uploads';
import type { CustomerAsset, ServiceCase } from '@/lib/portal/types-ext';
import type {
  ServiceCaseType,
  ServiceFaultCategory,
  ServicePriority,
} from '@/lib/portal/types-ext';

interface ServicePageClientProps {
  customerId: string;
  assets: CustomerAsset[];
  cases: ServiceCase[];
  creatorName: string;
  basePath?: string;
  isAdmin?: boolean;
}

const OPEN_STATUSES = ['submitted', 'triage', 'assigned', 'in_progress', 'waiting_parts', 'resolved'];

export function ServicePageClient({
  customerId,
  assets,
  cases,
  creatorName,
  basePath = '/aftermarket',
  isAdmin = false,
}: ServicePageClientProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [assetId, setAssetId] = useState(searchParams.get('asset') ?? assets[0]?.id ?? '');
  const [caseType, setCaseType] = useState<ServiceCaseType>('warranty');
  const [faultCategory, setFaultCategory] = useState<ServiceFaultCategory>('other');
  const [priority, setPriority] = useState<ServicePriority>('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [operatingConditions, setOperatingConditions] = useState('');
  const [requestedResolution, setRequestedResolution] = useState('on_site');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'open') return cases.filter((c) => OPEN_STATUSES.includes(c.status));
    if (filter === 'closed') return cases.filter((c) => ['closed', 'cancelled'].includes(c.status));
    return cases;
  }, [cases, filter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !subject.trim() || !description.trim()) return;

    setSubmitting(true);
    setError('');

    const { data: inserted, error: insertError } = await supabase
      .from('service_cases')
      .insert({
        customer_id: customerId,
        asset_id: assetId,
        case_type: caseType,
        fault_category: faultCategory,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        operating_conditions: operatingConditions.trim() || null,
        requested_resolution: requestedResolution,
        created_by_name: creatorName,
        status: 'submitted',
      })
      .select('id, case_number')
      .single();

    if (insertError || !inserted) {
      setSubmitting(false);
      setError(insertError?.message ?? 'Error');
      return;
    }

    for (const file of pendingFiles) {
      try {
        const uploaded = await uploadAftermarketFile(customerId, `service/${inserted.id}`, file);
        await supabase.from('service_case_attachments').insert({
          case_id: inserted.id,
          file_path: uploaded.path,
          file_name: uploaded.name,
          mime_type: file.type || null,
          file_size: file.size,
          uploaded_by: 'customer',
        });
      } catch {
        // continue
      }
    }

    await supabase.from('service_case_updates').insert({
      case_id: inserted.id,
      author_type: 'customer',
      author_name: creatorName,
      body: t('aftermarket.service.initialUpdate'),
    });

    try {
      await fetch('/api/aftermarket/service/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: inserted.id, caseNumber: inserted.case_number }),
      });
    } catch {
      // best effort
    }

    setSubmitting(false);
    setShowForm(false);
    router.push(`${basePath}/service/${inserted.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <AftermarketNav basePath={basePath} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'closed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={filterTabClass(filter === f)}
              onClick={() => setFilter(f)}
            >
              {t(`aftermarket.service.filter.${f}`)}
            </button>
          ))}
        </div>
        {!isAdmin && (
          <button type="button" className={btnPrimary} onClick={() => setShowForm(!showForm)}>
            <Plus size={16} className="shrink-0" aria-hidden />
            {t('aftermarket.service.newCase')}
          </button>
        )}
      </div>

      {showForm && !isAdmin && (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h2 className="font-bold text-bone">{t('aftermarket.service.formTitle')}</h2>

          {assets.length === 0 ? (
            <p className="text-sm text-danger">{t('aftermarket.service.noAssets')}</p>
          ) : (
            <>
              <div>
                <label className="label">{t('aftermarket.service.asset')}</label>
                <select className="input" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_tag} — {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">{t('aftermarket.service.caseType')}</label>
                  <select className="input" value={caseType} onChange={(e) => setCaseType(e.target.value as ServiceCaseType)}>
                    {(['warranty', 'paid_service', 'consultation'] as const).map((v) => (
                      <option key={v} value={v}>{t(`aftermarket.serviceType.${v}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t('aftermarket.service.faultCategory')}</label>
                  <select className="input" value={faultCategory} onChange={(e) => setFaultCategory(e.target.value as ServiceFaultCategory)}>
                    {(['weld_defect', 'deformation', 'coating', 'assembly', 'wear', 'electrical', 'other'] as const).map((v) => (
                      <option key={v} value={v}>{t(`aftermarket.faultCategory.${v}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t('aftermarket.service.priority')}</label>
                  <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as ServicePriority)}>
                    {(['low', 'normal', 'high', 'critical'] as const).map((v) => (
                      <option key={v} value={v}>{t(`aftermarket.priority.${v}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">{t('messages.subject')}</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>

              <div>
                <label className="label">{t('aftermarket.service.description')}</label>
                <textarea className="input min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>

              <div>
                <label className="label">{t('aftermarket.service.operatingConditions')}</label>
                <textarea className="input min-h-[80px]" value={operatingConditions} onChange={(e) => setOperatingConditions(e.target.value)} />
              </div>

              <div>
                <label className="label">{t('aftermarket.service.requestedResolution')}</label>
                <select className="input" value={requestedResolution} onChange={(e) => setRequestedResolution(e.target.value)}>
                  <option value="on_site">{t('aftermarket.resolution.on_site')}</option>
                  <option value="part_replacement">{t('aftermarket.resolution.part_replacement')}</option>
                  <option value="return">{t('aftermarket.resolution.return')}</option>
                </select>
              </div>

              <div>
                <label className="label">{t('aftermarket.service.attachments')}</label>
                <FileAttachmentPicker files={pendingFiles} onChange={setPendingFiles} />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={btnPrimary} disabled={submitting}>
                  {submitting ? t('common.saving') : t('aftermarket.service.submit')}
                </button>
                <button type="button" className={btnSecondary} onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-steel-2">{t('aftermarket.service.empty')}</div>
        ) : (
          filtered.map((c) => {
            const open = expandedId === c.id;
            return (
              <div key={c.id} className="card overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                  onClick={() => setExpandedId(open ? null : c.id)}
                >
                  <div>
                    <div className="font-mono text-sm text-arc-2">{c.case_number}</div>
                    <div className="font-bold text-bone mt-0.5">{c.subject}</div>
                    <div className="text-xs text-steel-2 mt-1">
                      {format(new Date(c.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <AftermarketStatusBadge kind="service" value={c.status} />
                    {open ? <ChevronUp size={18} className="shrink-0" aria-hidden /> : <ChevronDown size={18} className="shrink-0" aria-hidden />}
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-ink-4 pt-4">
                    <p className="text-sm text-steel-2 whitespace-pre-wrap">{c.description}</p>
                    <Link href={`${basePath}/service/${c.id}`} className="text-sm text-arc-2 font-semibold mt-3 inline-block">
                      {t('aftermarket.viewDetail')} →
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
