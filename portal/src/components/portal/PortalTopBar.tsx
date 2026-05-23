'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, Bell, PanelLeftOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { LangSwitcher } from '../LangSwitcher';

interface PortalTopBarProps {
  variant?: 'customer' | 'admin';
  userName: string;
  companyName: string;
  unreadMessages: number;
  sidebarOpen: boolean;
  onMenuToggle: () => void;
}

export function PortalTopBar({
  variant = 'customer',
  userName,
  companyName,
  unreadMessages,
  sidebarOpen,
  onMenuToggle,
}: PortalTopBarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

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
        <div>
          <div className="portal-topbar-eyebrow">
            {variant === 'admin' ? t('admin.panelEyebrow') : t('common.portal')}
          </div>
          <div className="portal-topbar-title">{companyName}</div>
        </div>
      </div>

      <div className="portal-topbar-right">
        <LangSwitcher />
        <Link
          href={variant === 'admin' ? '/admin/messages' : '/messages'}
          className="portal-topbar-bell"
          aria-label={t('sidebar.messages')}
        >
          <Bell size={18} />
          {unreadMessages > 0 && <span className="portal-topbar-bell-dot" />}
        </Link>
        <div className="portal-topbar-user">
          <div className="portal-topbar-user-name">{userName}</div>
          <div className="portal-topbar-user-company">{companyName}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="portal-topbar-logout"
          title={t('nav.logoutTitle')}
        >
          <LogOut size={17} />
          <span className="hidden lg:inline">{t('nav.logout')}</span>
        </button>
      </div>
    </header>
  );
}
