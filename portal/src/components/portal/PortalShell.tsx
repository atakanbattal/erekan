'use client';

import { useState } from 'react';
import { PortalSidebar } from './PortalSidebar';
import { PortalTopBar } from './PortalTopBar';

interface PortalShellProps {
  userName: string;
  companyName: string;
  unreadMessages: number;
  children: React.ReactNode;
}

export function PortalShell({
  userName,
  companyName,
  unreadMessages,
  children,
}: PortalShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="portal-layout">
      <PortalSidebar
        unreadMessages={unreadMessages}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="portal-main">
        <PortalTopBar
          userName={userName}
          companyName={companyName}
          unreadMessages={unreadMessages}
          onMenuToggle={() => setMobileOpen((v) => !v)}
        />
        <main className="portal-content">{children}</main>
      </div>
    </div>
  );
}
