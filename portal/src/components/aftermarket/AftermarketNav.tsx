'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, ClipboardList, Package, Wrench } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface AftermarketNavProps {
  basePath?: string;
}

export function AftermarketNav({ basePath = '/aftermarket' }: AftermarketNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = [
    { href: basePath, label: t('aftermarket.nav.overview'), icon: Box, exact: true },
    { href: `${basePath}/assets`, label: t('aftermarket.nav.assets'), icon: Package },
    { href: `${basePath}/service`, label: t('aftermarket.nav.service'), icon: Wrench },
    { href: `${basePath}/maintenance`, label: t('aftermarket.nav.maintenance'), icon: ClipboardList },
    { href: `${basePath}/parts`, label: t('aftermarket.nav.parts'), icon: Box },
  ];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label={t('aftermarket.title')}
      className="w-full overflow-hidden rounded-xl border border-ink-4 bg-ink-0 shadow-sm"
    >
      <div className="flex flex-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={[
                'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors',
                active
                  ? 'border-arc-2 bg-arc-2/5 text-arc-2'
                  : 'border-transparent text-steel-2 hover:bg-ink-2 hover:text-bone',
              ].join(' ')}
            >
              <Icon size={16} className="shrink-0" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
