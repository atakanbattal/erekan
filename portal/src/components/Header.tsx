'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Shield, LayoutDashboard, Package, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { LangSwitcher } from './LangSwitcher';

interface HeaderProps {
  isAdmin?: boolean;
  userName?: string;
  companyName?: string;
}

export function Header({ isAdmin, userName, companyName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

  const displayCompany =
    companyName && companyName !== userName
      ? companyName
      : isAdmin && !companyName
        ? t('nav.adminCompany')
        : companyName;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const navItems = isAdmin
    ? [
        { href: '/admin', label: t('nav.admin'), icon: Shield },
        { href: '/admin/orders', label: t('nav.orders'), icon: Package },
        { href: '/admin/customers', label: t('nav.customers'), icon: Users },
      ]
    : [{ href: '/dashboard', label: t('nav.myOrders'), icon: LayoutDashboard }];

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-brand">
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="site-header-logo">
            <span className="text-xl font-black tracking-tight text-bone">
              Arma<span className="text-arc-2">Weld</span>
            </span>
            <span className="hidden sm:inline eyebrow text-steel-2">{t('common.portal')}</span>
          </Link>
        </div>

        <nav className="site-header-nav" aria-label="Main">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`site-header-nav-link ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'site-header-nav-link--active'
                  : ''
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-toolbar">
          <LangSwitcher />
          <div className="header-actions">
            <div className="header-divider" aria-hidden />
            <div className="header-user">
              {userName && <div className="header-user-name">{userName}</div>}
              {displayCompany && displayCompany !== userName && (
                <div className="header-user-meta">{displayCompany}</div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="header-logout"
              title={t('nav.logoutTitle')}
            >
              <LogOut size={17} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
