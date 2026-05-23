'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES } from '@/lib/i18n/types';
import { LOCALE_LABELS, LOCALE_NAMES, LOCALE_FLAGS } from '@/lib/i18n/locale';

type MenuPosition = {
  top: number;
  right: number;
  minWidth: number;
};

export function LangSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const repositionMenu = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
      minWidth: Math.max(rect.width, 184),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    repositionMenu();
    window.addEventListener('resize', repositionMenu);
    window.addEventListener('scroll', repositionMenu, true);
    return () => {
      window.removeEventListener('resize', repositionMenu);
      window.removeEventListener('scroll', repositionMenu, true);
    };
  }, [open, repositionMenu]);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const menu =
    mounted && open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className="lang-dropdown lang-dropdown--fixed"
            role="listbox"
            aria-label={t('nav.lang')}
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
              minWidth: menuPosition.minWidth,
            }}
          >
            {LOCALES.map((code) => {
              const active = code === locale;
              return (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={`lang-option${active ? ' active' : ''}`}
                >
                  <span className="lang-option-flag" aria-hidden>
                    {LOCALE_FLAGS[code]}
                  </span>
                  <span className="lang-option-text">
                    <span className="lang-option-code">{LOCALE_LABELS[code]}</span>
                    {LOCALE_NAMES[code]}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="lang-switcher">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`lang-btn${open ? ' open' : ''}`}
        aria-label={t('nav.lang')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="lang-btn-flag" aria-hidden>
          {LOCALE_FLAGS[locale]}
        </span>
        <span className="lang-btn-code">{LOCALE_LABELS[locale]}</span>
        <ChevronDown size={14} className={`lang-btn-chevron${open ? ' open' : ''}`} />
      </button>
      {menu}
    </div>
  );
}
