'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { PartPicker } from '@/components/aftermarket/PartPicker';
import { btnPrimary } from '@/components/aftermarket/ui';
import type { CustomerAsset, SparePartCatalogItem } from '@/lib/portal/types-ext';

interface AdminAssetBomPanelProps {
  asset: CustomerAsset;
  catalog: SparePartCatalogItem[];
  existingPartIds: string[];
}

export function AdminAssetBomPanel({ asset, catalog, existingPartIds }: AdminAssetBomPanelProps) {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('1');
  const [saving, setSaving] = useState(false);

  const available = useMemo(
    () => catalog.filter((p) => !existingPartIds.includes(p.id)),
    [catalog, existingPartIds]
  );

  async function addBomLine(e: React.FormEvent) {
    e.preventDefault();
    if (!partId) return;
    setSaving(true);
    await supabase.from('asset_bom').insert({
      asset_id: asset.id,
      part_id: partId,
      qty: Number(qty),
    });
    setSaving(false);
    setPartId('');
    router.refresh();
  }

  if (available.length === 0) {
    return (
      <p className="mt-4 text-sm text-steel-2">{t('aftermarket.admin.allPartsInBom')}</p>
    );
  }

  return (
    <form
      onSubmit={addBomLine}
      className="mt-4 overflow-visible rounded-lg border border-ink-4 bg-ink-2 p-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_7rem_auto] lg:items-end">
        <div className="min-w-0">
          <label className="label mb-1.5">{t('aftermarket.admin.selectPart')}</label>
          <PartPicker parts={available} value={partId} onChange={setPartId} required />
        </div>
        <div>
          <label className="label mb-1.5">{t('aftermarket.parts.qty')}</label>
          <input className="input w-full" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <button type="submit" className={`${btnPrimary} h-11 w-full lg:w-auto`} disabled={saving}>
          {t('aftermarket.admin.addToBom')}
        </button>
      </div>
    </form>
  );
}
