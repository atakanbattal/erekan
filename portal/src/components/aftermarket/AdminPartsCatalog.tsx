'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketListToolbar } from '@/components/aftermarket/AftermarketListToolbar';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { btnPrimary, btnSecondarySm } from '@/components/aftermarket/ui';
import type { SparePartCatalogItem, SparePartRequestStatus, SparePartStockStatus } from '@/lib/portal/types-ext';

interface AdminPartsCatalogProps {
  catalog: SparePartCatalogItem[];
  requests: { id: string; request_number: string; status: string }[];
}

type StockFilter = 'all' | SparePartStockStatus;

export function AdminPartsCatalog({ catalog, requests }: AdminPartsCatalogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [drawingRef, setDrawingRef] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const [quoteRequestId, setQuoteRequestId] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  const stockFilters: { id: StockFilter; label: string }[] = [
    { id: 'all', label: t('aftermarket.parts.filterStock.all') },
    { id: 'in_stock', label: t('aftermarket.stockStatus.in_stock') },
    { id: 'limited', label: t('aftermarket.stockStatus.limited') },
    { id: 'made_to_order', label: t('aftermarket.stockStatus.made_to_order') },
    { id: 'discontinued', label: t('aftermarket.stockStatus.discontinued') },
  ];

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((p) => {
      if (stockFilter !== 'all' && p.stock_status !== stockFilter) return false;
      if (!q) return true;
      return (
        p.part_number.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [catalog, search, stockFilter]);

  async function addPart(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('spare_part_catalog').insert({
      part_number: partNumber.trim(),
      name: name.trim(),
      description: description.trim() || null,
      drawing_ref: drawingRef.trim() || null,
      unit_price: unitPrice ? Number(unitPrice) : null,
    });
    setSaving(false);
    setShowForm(false);
    setPartNumber('');
    setName('');
    router.refresh();
  }

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!quoteRequestId) return;
    setSaving(true);
    await supabase
      .from('spare_part_requests')
      .update({
        status: 'quoted' as SparePartRequestStatus,
        quote_amount: quoteAmount ? Number(quoteAmount) : null,
        admin_notes: quoteNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteRequestId);

    const req = requests.find((r) => r.id === quoteRequestId);
    try {
      await fetch('/api/aftermarket/parts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: quoteRequestId, requestNumber: req?.request_number, quoted: true }),
      });
    } catch {
      // best effort
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-bone">{t('aftermarket.admin.catalog')}</h2>
          <button type="button" className={btnSecondarySm} onClick={() => setShowForm(!showForm)}>
            <Plus size={14} className="shrink-0" aria-hidden />
            {t('aftermarket.admin.addPart')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addPart} className="mb-4 space-y-3 border-b border-ink-4 pb-4">
            <input className="input" placeholder={t('aftermarket.parts.partNumber')} value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required />
            <input className="input" placeholder={t('aftermarket.parts.partName')} value={name} onChange={(e) => setName(e.target.value)} required />
            <textarea className="input" placeholder={t('aftermarket.parts.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="input" placeholder={t('aftermarket.parts.drawing')} value={drawingRef} onChange={(e) => setDrawingRef(e.target.value)} />
            <input className="input" type="number" step="0.01" placeholder={t('aftermarket.admin.unitPrice')} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            <button type="submit" className={btnPrimary} disabled={saving}>{t('common.save')}</button>
          </form>
        )}

        <AftermarketListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('aftermarket.parts.search')}
          count={filteredCatalog.length}
          total={catalog.length}
          filters={stockFilters}
          activeFilter={stockFilter}
          onFilterChange={(id) => setStockFilter(id as StockFilter)}
        />

        <div className="mt-4 overflow-hidden rounded-lg border border-ink-4">
          <div className="overflow-x-auto">
            <table className="orders-table w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-4 bg-ink-3">
                  <th className="table-head p-3 text-left">{t('aftermarket.parts.partNumber')}</th>
                  <th className="table-head p-3 text-left">{t('aftermarket.parts.partName')}</th>
                  <th className="table-head hidden p-3 text-left md:table-cell">{t('aftermarket.parts.stock')}</th>
                  <th className="table-head hidden p-3 text-left sm:table-cell">{t('aftermarket.parts.price')}</th>
                  <th className="table-head hidden p-3 text-left lg:table-cell">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-steel-2">
                      {t('aftermarket.list.noResults')}
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((part) => (
                    <tr key={part.id} className="border-b border-ink-4">
                      <td className="p-3 font-mono text-arc-2">{part.part_number}</td>
                      <td className="p-3">
                        <div className="font-medium text-bone">{part.name}</div>
                        {part.description && <div className="text-xs text-steel-2">{part.description}</div>}
                      </td>
                      <td className="hidden p-3 md:table-cell">
                        <AftermarketStatusBadge kind="stock" value={part.stock_status} />
                      </td>
                      <td className="hidden p-3 sm:table-cell text-bone">
                        {part.unit_price != null ? `${part.unit_price} ${part.currency}` : '—'}
                      </td>
                      <td className="hidden p-3 lg:table-cell">
                        <span className={part.is_active ? 'text-success' : 'text-steel-2'}>
                          {part.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-bold text-bone">{t('aftermarket.admin.submitQuote')}</h2>
        <form onSubmit={submitQuote} className="space-y-3">
          <select className="input" value={quoteRequestId} onChange={(e) => setQuoteRequestId(e.target.value)} required>
            <option value="">{t('aftermarket.admin.selectRequest')}</option>
            {requests.filter((r) => r.status === 'submitted').map((r) => (
              <option key={r.id} value={r.id}>{r.request_number}</option>
            ))}
          </select>
          <input className="input" type="number" step="0.01" placeholder={t('aftermarket.admin.quoteAmount')} value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
          <textarea className="input" placeholder={t('aftermarket.admin.quoteNotes')} value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} />
          <button type="submit" className={btnPrimary} disabled={saving}>{t('aftermarket.admin.sendQuote')}</button>
        </form>
      </div>
    </div>
  );
}
