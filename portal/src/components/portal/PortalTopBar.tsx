'use client';

import Link from 'next/link';
import { LogOut, Menu, Bell, PanelLeftOpen, Settings } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { LangSwitcher } from '../LangSwitcher';
import { AdminGlobalSearch } from '../admin/AdminGlobalSearch';

interface PortalTopBarProps {
  variant?: 'customer' | 'admin';
  userName: string;
  companyName: string;
  unreadMessages: number;
  unreadNotifications?: number;
  sidebarOpen: boolean;
  onMenuToggle: () => void;
}

export function PortalTopBar({
  variant = 'customer',
  userName,
  companyName,
  unreadMessages,
  unreadNotifications = 0,
  sidebarOpen,
  onMenuToggle,
}: PortalTopBarProps) {
  const { t } = useI18n();
  const notifHref = variant === 'admin' ? '/admin/notifications' : '/notifications';
  const totalAlerts = unreadMessages + unreadNotifications;

  return (
    <header className="portal-topbar">
      <div className="portal-topbar-left">
        <button
          type="button"
          className={`portal-topbar-menu ${sidebarOpen ? '' : 'portal-topbar-menu--highlight'}`}
          onClick={onMenuToggle}
          aria-label={sidebarOpen ? t('sidebar.collapse') : t('sidebar.expand')}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <Menu size={20} /> : <PanelLeftOpen size={20} />}
        </button>
        <div className="portal-topbar-brand">
          <div className="portal-topbar-eyebrow">
            {variant === 'admin' ? t('admin.panelEyebrow') : t('common.portal')}
          </div>
          <div className="portal-topbar-title">{companyName}</div>
        </div>
      </div>

      <div className="portal-topbar-center">
        {variant === 'admin' ? <AdminGlobalSearch /> : null}
      </div>

      <div className="portal-topbar-right">
        <LangSwitcher />
        <Link
          href={notifHref}
          className="portal-topbar-bell"
          aria-label={t('notifications.title')}
        >
          <Bell size={18} />
          {totalAlerts > 0 && (
            <span className="portal-topbar-bell-dot">
              {totalAlerts > 9 ? '9+' : totalAlerts}
            </span>
          )}
        </Link>
        {variant === 'customer' && (
          <Link href="/settings" className="portal-topbar-bell" aria-label={t('settingsPage.title')}>
            <Settings size={18} />
          </Link>
        )}
        <span className="portal-topbar-user-name">{userName}</span>
        <form action="/auth/signout" method="POST" className="portal-topbar-logout-form">
          <button
            type="submit"
            className="portal-topbar-logout"
            title={t('nav.logoutTitle')}
          >
            <LogOut size={17} />
            <span className="portal-topbar-logout-label">{t('nav.logout')}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
