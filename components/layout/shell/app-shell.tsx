'use client';

/**
 * AppShell - lightweight wrapper providing offline banner, network indicator,
 * and mobile bottom navigation.
 *
 * Sidebar layout is fully managed by shadcn/ui SidebarProvider + Sidebar
 * components. AppShell does NOT manage sidebar state or rendering — that
 * responsibility belongs to the layout files that compose SidebarProvider.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  NetworkStatusIndicator,
  OfflineBanner,
} from '@/components/layout/feedback/network-status-indicator';
import { MobileBottomNav } from '../navigation/mobile-bottom-nav';
import { useIsMobile } from '@/hooks/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Offline Banner - shown when user is offline */}
      <OfflineBanner />

      {children}

      {/* Network Status Indicator - fixed position at bottom right */}
      <div className={cn('fixed z-40', isMobile ? 'bottom-20 right-4' : 'bottom-4 right-4')}>
        <NetworkStatusIndicator showLabel />
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </>
  );
}

export default AppShell;
