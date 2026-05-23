'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  FileText,
  MessageSquare,
  HeadphonesIcon,
  Building2,
  X,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface PortalSidebarProps {
  unreadMessages: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function PortalSidebar({
  unreadMessages,
  mobileOpen = false,
  onMobileClose,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: '/dashboard', label: t('sidebar.home'), icon: Home },
    { href: '/orders', label: t('sidebar.orders'), icon: Package },
    { href: '/documents', label: t('sidebar.documents'), icon: FileText },
    {
      href: '/messages',
      label: t('sidebar.messages'),
      icon: MessageSquare,
      badge: unreadMessages,
    },
    { href: '/support', label: t('sidebar.support'), icon: HeadphonesIcon },
    { href: '/company', label: t('sidebar.company'), icon: Building2 },
  ];

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="portal-sidebar-backdrop"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      )}
      <aside className={`portal-sidebar ${mobileOpen ? 'portal-sidebar--open' : ''}`}>
        <div className="portal-sidebar-brand">
          <Link href="/dashboard" className="portal-sidebar-logo" onClick={onMobileClose}>
            <span className="portal-sidebar-logo-mark">AW</span>
            <span className="portal-sidebar-logo-text">
              Arma<span className="text-arc-2">Weld</span>
            </span>
          </Link>
          {onMobileClose && (
            <button type="button" className="portal-sidebar-close" onClick={onMobileClose}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="portal-sidebar-nav" aria-label="Portal">
          {navItems.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className={`portal-sidebar-link ${isActive(href) ? 'portal-sidebar-link--active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge != null && badge > 0 && (
                <span className="portal-sidebar-badge">{badge > 99 ? '99+' : badge}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="portal-sidebar-help">
          <HeadphonesIcon size={20} className="text-arc-2 mb-2" />
          <p className="portal-sidebar-help-title">{t('sidebar.helpTitle')}</p>
          <p className="portal-sidebar-help-desc">{t('sidebar.helpDesc')}</p>
          <Link href="/support" className="portal-sidebar-help-btn" onClick={onMobileClose}>
            {t('sidebar.createSupport')}
          </Link>
        </div>
      </aside>
    </>
  );
}
