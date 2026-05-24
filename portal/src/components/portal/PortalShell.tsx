'use client';

import { useEffect, useState } from 'react';
import { PortalSidebar, type SidebarVariant } from './PortalSidebar';
import { PortalTopBar } from './PortalTopBar';

const SIDEBAR_STORAGE_KEY = 'armaweld-sidebar-open';

interface PortalShellProps {
  variant?: SidebarVariant;
  userName: string;
  companyName: string;
  unreadMessages: number;
  unreadNotifications?: number;
  homeHref?: string;
  children: React.ReactNode;
}

export function PortalShell({
  variant = 'customer',
  userName,
  companyName,
  unreadMessages,
  unreadNotifications = 0,
  homeHref,
  children,
}: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const totalBadge = unreadMessages + unreadNotifications;

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setSidebarOpen(stored === 'true');
      return;
    }
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setSidebarOpen(false);
    }
  }, []);

  function toggleSidebar() {
    setSidebarOpen((open) => {
      const next = !open;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  function closeSidebar() {
    setSidebarOpen(false);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'false');
  }

  return (
    <div
      className={`portal-layout ${sidebarOpen ? 'portal-layout--sidebar-open' : 'portal-layout--sidebar-closed'}`}
    >
      <PortalSidebar
        variant={variant}
        unreadMessages={totalBadge}
        homeHref={homeHref}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onToggle={toggleSidebar}
      />
      <div className="portal-main">
        <PortalTopBar
          variant={variant}
          userName={userName}
          companyName={companyName}
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
          sidebarOpen={sidebarOpen}
          onMenuToggle={toggleSidebar}
        />
        <main className="portal-content">{children}</main>
      </div>
    </div>
  );
}
