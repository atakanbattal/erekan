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
  Users,
  Shield,
  X,
  PanelLeftClose,
  Bell,
  FileQuestion,
  Settings,
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

export type SidebarVariant = 'customer' | 'admin';

interface PortalSidebarProps {
  variant?: SidebarVariant;
  unreadMessages: number;
  homeHref?: string;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function PortalSidebar({
  variant = 'customer',
  unreadMessages,
  homeHref,
  isOpen,
  onClose,
  onToggle,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const defaultHome = variant === 'admin' ? '/admin' : '/dashboard';

  const customerItems: { href: string; label: string; icon: LucideIcon; badge?: number }[] = [
    { href: '/dashboard', label: t('sidebar.home'), icon: Home },
    { href: '/orders', label: t('sidebar.orders'), icon: Package },
    { href: '/documents', label: t('sidebar.documents'), icon: FileText },
    { href: '/messages', label: t('sidebar.messages'), icon: MessageSquare },
    { href: '/notifications', label: t('notifications.title'), icon: Bell },
    { href: '/rfq', label: t('rfqPage.title'), icon: FileQuestion },
    { href: '/support', label: t('sidebar.support'), icon: HeadphonesIcon },
    { href: '/team', label: t('teamPage.title'), icon: Users },
    { href: '/company', label: t('sidebar.company'), icon: Building2 },
    { href: '/settings', label: t('settingsPage.title'), icon: Settings },
  ];

  const adminItems: { href: string; label: string; icon: LucideIcon; badge?: number }[] = [
    { href: '/admin', label: t('nav.admin'), icon: Shield },
    { href: '/admin/orders', label: t('nav.orders'), icon: Package },
    { href: '/admin/customers', label: t('nav.customers'), icon: Users },
    { href: '/admin/messages', label: t('nav.messages'), icon: MessageSquare },
    { href: '/admin/notifications', label: t('notifications.title'), icon: Bell },
    { href: '/admin/rfq', label: t('adminRfqPage.title'), icon: FileQuestion },
    { href: '/admin/templates', label: t('templatesPage.title'), icon: LayoutTemplate },
  ];

  const navItems = variant === 'admin' ? adminItems : customerItems;
  const brandHref = homeHref ?? defaultHome;
  const messagePaths = ['/messages', '/admin/messages'];

  function isMessageNav(href: string) {
    return messagePaths.includes(href);
  }

  function isActive(href: string) {
    if (href === '/dashboard' || href === '/admin') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleNavClick() {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      onClose();
    }
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="portal-sidebar-backdrop"
          aria-label={t('sidebar.collapse')}
          onClick={onClose}
        />
      )}
      <aside className={`portal-sidebar ${isOpen ? 'portal-sidebar--open' : ''}`}>
        <div className="portal-sidebar-brand">
          <Link href={brandHref} className="portal-sidebar-logo" onClick={handleNavClick}>
            <span className="portal-sidebar-logo-text">
              Arma<span className="text-arc-2">Weld</span>
            </span>
          </Link>
          <button
            type="button"
            className="portal-sidebar-close portal-sidebar-close--mobile"
            onClick={onClose}
            aria-label={t('sidebar.collapse')}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="portal-sidebar-nav" aria-label="Portal">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={`portal-sidebar-link ${isActive(href) ? 'portal-sidebar-link--active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {isMessageNav(href) && unreadMessages > 0 && (
                <span className="portal-sidebar-badge">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {variant === 'customer' && (
          <div className="portal-sidebar-help">
            <HeadphonesIcon size={20} className="text-arc-2 mb-2" />
            <p className="portal-sidebar-help-title">{t('sidebar.helpTitle')}</p>
            <p className="portal-sidebar-help-desc">{t('sidebar.helpDesc')}</p>
            <Link href="/support" className="portal-sidebar-help-btn" onClick={handleNavClick}>
              {t('sidebar.createSupport')}
            </Link>
          </div>
        )}

        {variant === 'admin' && (
          <div className="portal-sidebar-help">
            <p className="portal-sidebar-help-title">{t('admin.panelEyebrow')}</p>
            <p className="portal-sidebar-help-desc">{t('messages.adminInboxDesc')}</p>
            <Link href="/admin/messages" className="portal-sidebar-help-btn" onClick={handleNavClick}>
              {t('nav.messages')} →
            </Link>
          </div>
        )}

        <button
          type="button"
          className="portal-sidebar-toggle"
          onClick={onToggle}
          aria-label={t('sidebar.collapse')}
        >
          <PanelLeftClose size={18} />
          <span>{t('sidebar.collapse')}</span>
        </button>
      </aside>
    </>
  );
}
