'use client';

import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Download, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketNav } from '@/components/aftermarket/AftermarketNav';
import { AftermarketListToolbar } from '@/components/aftermarket/AftermarketListToolbar';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import { btnPrimary, btnPrimarySm, btnSecondary, btnSecondarySm, rowCard } from '@/components/aftermarket/ui';
import type {
  CustomerAsset,
  SparePartCatalogItem,
  SparePartRequest,
  SparePartStockStatus,
} from '@/lib/portal/types-ext';

interface CartLine {
  part: SparePartCatalogItem;
  qty: number;
  notes: string;
}

interface PartsPageClientProps {
  customerId: string;
  assets: CustomerAsset[];
  catalog: SparePartCatalogItem[];
  requests: SparePartRequest[];
  bomByAsset?: Record<string, string[]>;
  basePath?: string;
  isAdmin?: boolean;
}

type StockFilter = 'all' | SparePartStockStatus;
type ScopeFilter = 'all' | 'for_asset';

export function PartsPageClient({
  customerId,
  assets,
  catalog,
  requests,
  bomByAsset = {},
  basePath = '/aftermarket',
  isAdmin = false,
}: PartsPageClientProps) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const initialAsset = searchParams.get('asset') ?? '';
  const [showRequest, setShowRequest] = useState(searchParams.get('new') === '1');
  const [assetId, setAssetId] = useState(initialAsset);
  const [scopeAssetId, setScopeAssetId] = useState(initialAsset);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(initialAsset ? 'for_asset' : 'all');
  const [submitting, setSubmitting] = useState(false);

  const stockFilters: { id: StockFilter; label: string }[] = [
    { id: 'all', label: t('aftermarket.parts.filterStock.all') },
    { id: 'in_stock', label: t('aftermarket.stockStatus.in_stock') },
    { id: 'limited', label: t('aftermarket.stockStatus.limited') },
    { id: 'made_to_order', label: t('aftermarket.stockStatus.made_to_order') },
    { id: 'discontinued', label: t('aftermarket.stockStatus.discontinued') },
  ];

  const bomPartIds = useMemo(() => {
    if (scopeFilter !== 'for_asset' || !scopeAssetId) return null;
    return new Set(bomByAsset[scopeAssetId] ?? []);
  }, [bomByAsset, scopeAssetId, scopeFilter]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((p) => {
      if (stockFilter !== 'all' && p.stock_status !== stockFilter) return false;
      if (bomPartIds && !bomPartIds.has(p.id)) return false;
      if (!q) return true;
      return (
        p.part_number.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.drawing_ref?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [catalog, search, stockFilter, bomPartIds]);

  function addToCart(part: SparePartCatalogItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.part.id === part.id);
      if (existing) {
        return prev.map((l) => (l.part.id === part.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { part, qty: 1, notes: '' }];
    });
  }

  function removeFromCart(partId: string) {
    setCart((prev) => prev.filter((l) => l.part.id !== partId));
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmitting(true);
    const { data: req, error } = await supabase
      .from('spare_part_requests')
      .insert({
        customer_id: customerId,
        asset_id: assetId || null,
        status: 'submitted',
        notes: notes.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      .select('id, request_number')
      .single();

    if (error || !req) {
      setSubmitting(false);
      return;
    }

    await supabase.from('spare_part_request_lines').insert(
      cart.map((line) => ({
        request_id: req.id,
        part_id: line.part.id,
        part_number: line.part.part_number,
        part_name: line.part.name,
        qty: line.qty,
        unit: line.part.unit,
        notes: line.notes || null,
      }))
    );

    try {
      await fetch('/api/aftermarket/parts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, requestNumber: req.request_number }),
      });
    } catch {
      // best effort
    }

    setSubmitting(false);
    setCart([]);
    setNotes('');
    setShowRequest(false);
    router.refresh();
  }

  async function downloadQuote(req: SparePartRequest) {
    if (!req.quote_file_path) return;
    const res = await fetch(`/api/aftermarket/parts/${req.id}/quote`);
    if (!res.ok) return;
    const data = await res.json();
    window.open(data.url, '_blank');
  }

  async function respondRequest(reqId: string, response: 'approved' | 'rejected') {
    await supabase
      .from('spare_part_requests')
      .update({ status: response, updated_at: new Date().toISOString() })
      .eq('id', reqId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <AftermarketNav basePath={basePath} />

      {!isAdmin && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button type="button" className={`${btnPrimary} relative`} onClick={() => setShowRequest(!showRequest)}>
            <ShoppingCart size={16} className="shrink-0" aria-hidden />
            {t('aftermarket.parts.cart')}
            {cart.length > 0 && <span className="portal-sidebar-badge ml-1">{cart.length}</span>}
          </button>
        </div>
      )}

      {showRequest && !isAdmin && (
        <form onSubmit={submitRequest} className="card space-y-4 p-6">
          <h2 className="font-bold text-bone">{t('aftermarket.parts.newRequest')}</h2>

          {assets.length > 0 && (
            <div>
              <label className="label">{t('aftermarket.parts.relatedAsset')}</label>
              <select className="input" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">{t('aftermarket.parts.noAsset')}</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.asset_tag} — {a.title}</option>
                ))}
              </select>
            </div>
          )}

          {cart.length === 0 ? (
            <p className="text-sm text-steel-2">{t('aftermarket.parts.cartEmpty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-4">
                    <th className="table-head p-2 text-left">{t('aftermarket.parts.partNumber')}</th>
                    <th className="table-head p-2 text-left">{t('aftermarket.parts.qty')}</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.part.id} className="border-b border-ink-4">
                      <td className="p-2">
                        <div className="font-mono text-bone">{line.part.part_number}</div>
                        <div className="text-xs text-steel-2">{line.part.name}</div>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={1}
                          className="input w-20"
                          value={line.qty}
                          onChange={(e) =>
                            setCart((prev) =>
                              prev.map((l) =>
                                l.part.id === line.part.id ? { ...l, qty: Number(e.target.value) } : l
                              )
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <button type="button" onClick={() => removeFromCart(line.part.id)} className="text-danger">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="label">{t('aftermarket.parts.notes')}</label>
            <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button type="submit" className={btnPrimary} disabled={submitting || cart.length === 0}>
            {submitting ? t('common.saving') : t('aftermarket.parts.submitRequest')}
          </button>
        </form>
      )}

      <div className="card p-6">
        <h2 className="mb-4 font-bold text-bone">{t('aftermarket.parts.catalogTitle')}</h2>

        <AftermarketListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('aftermarket.parts.search')}
          count={filteredCatalog.length}
          total={catalog.length}
          filters={stockFilters}
          activeFilter={stockFilter}
          onFilterChange={(id) => setStockFilter(id as StockFilter)}
        >
          {!isAdmin && assets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={scopeFilter === 'all' ? btnPrimarySm : btnSecondarySm}
                onClick={() => setScopeFilter('all')}
              >
                {t('aftermarket.parts.scope.all')}
              </button>
              <button
                type="button"
                className={scopeFilter === 'for_asset' ? btnPrimarySm : btnSecondarySm}
                onClick={() => setScopeFilter('for_asset')}
              >
                {t('aftermarket.parts.scope.forAsset')}
              </button>
              {scopeFilter === 'for_asset' && (
                <select
                  className="input max-w-xs text-sm"
                  value={scopeAssetId}
                  onChange={(e) => setScopeAssetId(e.target.value)}
                >
                  <option value="">{t('aftermarket.parts.scope.selectAsset')}</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.asset_tag} — {a.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </AftermarketListToolbar>

        {scopeFilter === 'for_asset' && scopeAssetId && bomPartIds && bomPartIds.size === 0 && (
          <p className="mt-3 text-sm text-steel-2">{t('aftermarket.parts.scope.noBom')}</p>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border border-ink-4">
          <div className="overflow-x-auto">
            <table className="orders-table w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-4 bg-ink-3">
                  <th className="table-head p-4 text-left">{t('aftermarket.parts.partNumber')}</th>
                  <th className="table-head p-4 text-left">{t('aftermarket.parts.partName')}</th>
                  <th className="table-head hidden p-4 text-left md:table-cell">{t('aftermarket.parts.description')}</th>
                  <th className="table-head hidden p-4 text-left lg:table-cell">{t('aftermarket.parts.drawing')}</th>
                  <th className="table-head p-4 text-left">{t('aftermarket.parts.stock')}</th>
                  <th className="table-head hidden p-4 text-left sm:table-cell">{t('aftermarket.parts.price')}</th>
                  {!isAdmin && <th className="table-head p-4 text-left">{t('aftermarket.parts.action')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 7} className="p-8 text-center text-steel-2">
                      {t('aftermarket.list.noResults')}
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((part) => (
                    <tr key={part.id} className="border-b border-ink-4 transition-colors hover:bg-ink-3/30">
                      <td className="p-4 font-mono text-arc-2">{part.part_number}</td>
                      <td className="p-4 font-medium text-bone">{part.name}</td>
                      <td className="hidden max-w-xs truncate p-4 text-steel-2 md:table-cell">
                        {part.description ?? '—'}
                      </td>
                      <td className="hidden p-4 text-steel-2 lg:table-cell">{part.drawing_ref ?? '—'}</td>
                      <td className="p-4">
                        <AftermarketStatusBadge kind="stock" value={part.stock_status} />
                      </td>
                      <td className="hidden p-4 text-bone sm:table-cell">
                        {part.unit_price != null ? `${part.unit_price} ${part.currency}` : '—'}
                      </td>
                      {!isAdmin && (
                        <td className="p-4">
                          <button type="button" className={btnSecondarySm} onClick={() => addToCart(part)}>
                            <Plus size={14} className="shrink-0" aria-hidden />
                            {t('aftermarket.parts.addToCart')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-bold text-bone">{t('aftermarket.parts.myRequests')}</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-steel-2">{t('aftermarket.parts.noRequests')}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className={rowCard}>
                <div className="min-w-0">
                  <div className="font-mono text-sm text-arc-2">{req.request_number}</div>
                  <div className="mt-1 text-xs text-steel-2">
                    {format(new Date(req.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                    {req.lines?.length ? ` · ${req.lines.length} ${t('aftermarket.parts.lineItems')}` : ''}
                    {isAdmin && req.customers?.company_name ? ` · ${req.customers.company_name}` : ''}
                  </div>
                  {req.quote_amount != null && (
                    <div className="mt-1 text-sm font-semibold text-bone">
                      {req.quote_amount} {req.quote_currency}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AftermarketStatusBadge kind="parts" value={req.status} />
                  {req.quote_file_path && (
                    <button type="button" className={btnSecondarySm} onClick={() => downloadQuote(req)}>
                      <Download size={14} className="shrink-0" aria-hidden />
                      {t('aftermarket.parts.downloadQuote')}
                    </button>
                  )}
                  {!isAdmin && req.status === 'quoted' && (
                    <>
                      <button type="button" className={btnPrimarySm} onClick={() => respondRequest(req.id, 'approved')}>
                        {t('aftermarket.parts.approve')}
                      </button>
                      <button type="button" className={btnSecondarySm} onClick={() => respondRequest(req.id, 'rejected')}>
                        {t('aftermarket.parts.reject')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
