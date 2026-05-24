'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hash, MessageSquare, Search, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface SearchResult {
  type: 'order' | 'customer' | 'message';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS = {
  order: Hash,
  customer: Users,
  message: MessageSquare,
} as const;

const TYPE_LABELS = {
  order: 'adminSearch.typeOrder',
  customer: 'adminSearch.typeCustomer',
  message: 'adminSearch.typeMessage',
} as const;

export function AdminGlobalSearch() {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <div ref={containerRef} className="admin-global-search">
      <div className="orders-search">
        <Search size={16} className="orders-search-icon" />
        <input
          type="search"
          className="input orders-search-input"
          placeholder={t('adminSearch.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          aria-expanded={open}
          aria-haspopup="listbox"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 card border border-ink-4 shadow-lg overflow-hidden">
          {loading ? (
            <p className="text-sm text-steel-2 p-4">{t('common.loading')}</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-steel-2 p-4">{t('adminSearch.noResults')}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto" role="listbox">
              {results.map((result) => {
                const Icon = TYPE_ICONS[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link
                      href={result.href}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-ink-3/50 transition-colors border-b border-ink-4 last:border-b-0"
                      onClick={() => handleSelect(result.href)}
                    >
                      <Icon size={16} className="text-arc-2 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-steel-2 mb-0.5">
                          {t(TYPE_LABELS[result.type])}
                        </div>
                        <div className="text-sm font-medium text-bone truncate">
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-xs text-steel-2 truncate">{result.subtitle}</div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
