'use client';

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { AftermarketStatusBadge } from '@/components/aftermarket/AftermarketStatusBadge';
import type { SparePartCatalogItem } from '@/lib/portal/types-ext';

interface PartPickerProps {
  parts: SparePartCatalogItem[];
  value: string;
  onChange: (partId: string) => void;
  required?: boolean;
}

export function PartPicker({ parts, value, onChange, required }: PartPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = parts.find((p) => p.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter(
      (p) =>
        p.part_number.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.drawing_ref?.toLowerCase().includes(q) ?? false)
    );
  }, [parts, query]);

  useEffect(() => setMounted(true), []);

  function updateMenuPosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const maxLeft = window.innerWidth - width - 8;
    setMenuRect({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, maxLeft)),
      width,
    });
  }

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById('part-picker-menu');
      if (menu?.contains(target)) return;
      setOpen(false);
    }

    function onReposition() {
      updateMenuPosition();
    }

    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  function pick(partId: string) {
    onChange(partId);
    setOpen(false);
    setQuery('');
  }

  const menu =
    open && menuRect && mounted
      ? createPortal(
          <div
            id="part-picker-menu"
            role="listbox"
            className="fixed z-[9999] overflow-hidden rounded-xl border border-ink-4 bg-ink-0 shadow-2xl"
            style={{
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
            }}
          >
            <div className="border-b border-ink-4 bg-ink-2/80 p-3">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-2"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="search"
                  className="input w-full pl-9 text-sm"
                  placeholder={t('aftermarket.admin.partPickerPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-steel-2">
                {filtered.length} / {parts.length}
              </p>
            </div>
            <ul className="max-h-64 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-steel-2">
                  {t('aftermarket.admin.noPartsFound')}
                </li>
              ) : (
                filtered.map((part) => (
                  <li key={part.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === part.id}
                      className={[
                        'flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors',
                        value === part.id ? 'bg-arc-2/10 ring-1 ring-arc-2/30' : 'hover:bg-ink-2',
                      ].join(' ')}
                      onClick={() => pick(part.id)}
                    >
                      <span className="font-mono text-xs font-semibold text-arc-2">{part.part_number}</span>
                      <span className="text-sm font-medium text-bone">{part.name}</span>
                      {part.description && (
                        <span className="text-xs leading-snug text-steel-2">{part.description}</span>
                      )}
                      <AftermarketStatusBadge kind="stock" value={part.stock_status} />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        className="input flex min-h-11 w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`min-w-0 truncate ${selected ? 'text-bone' : 'text-steel-2'}`}>
          {selected ? `${selected.part_number} — ${selected.name}` : t('aftermarket.admin.selectPart')}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-steel-2 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {required && !value && (
        <input tabIndex={-1} className="pointer-events-none absolute opacity-0" required value={value} readOnly />
      )}

      {menu}
    </div>
  );
}
