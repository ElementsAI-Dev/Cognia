'use client';

/**
 * AppShell - main application layout with sidebar and content area
 * Provides responsive layout with collapsible sidebar for desktop
 * Includes mobile bottom navigation for touch devices
 */

import React, { useRef, useEffect } from 'react';
import { useUIStore, useSettingsStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  NetworkStatusIndicator,
  OfflineBanner,
} from '@/components/layout/network-status-indicator';
import { MobileBottomNav } from './mobile-bottom-nav';
import { useIsMobile } from '@/hooks/utils';
import { useSwipeGesture } from '@/hooks/utils';

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function AppShell({ children, sidebar }: AppShellProps) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const isMobile = useIsMobile();
  const mainRef = useRef<HTMLDivElement>(null);
  const prevSidebarStateRef = useRef<{ open: boolean; collapsed: boolean } | null>(null);

  // Auto-hide sidebar when simplified mode is enabled with autoHideSidebar setting
  useEffect(() => {
    const isSimplifiedMode = simplifiedModeSettings.enabled;
    const shouldAutoHide = isSimplifiedMode && simplifiedModeSettings.autoHideSidebar;
    
    if (shouldAutoHide && sidebarOpen) {
      // Store previous state before hiding
      prevSidebarStateRef.current = { open: sidebarOpen, collapsed: sidebarCollapsed };
      setSidebarOpen(false);
    } else if (!shouldAutoHide && prevSidebarStateRef.current) {
      // Restore previous state when exiting simplified mode
      setSidebarOpen(prevSidebarStateRef.current.open);
      prevSidebarStateRef.current = null;
    }
  }, [simplifiedModeSettings.enabled, simplifiedModeSettings.autoHideSidebar, sidebarOpen, sidebarCollapsed, setSidebarOpen]);

  // Swipe gesture for mobile - swipe right to open sidebar
  useSwipeGesture(mainRef, {
    onSwipeRight: () => {
      if (isMobile && !sidebarOpen) {
        setSidebarOpen(true);
      }
    },
    threshold: 80,
  });

  // Clone sidebar element with collapsed prop (only for React components, not DOM elements)
  const sidebarWithProps = sidebar
    ? React.isValidElement(sidebar) && typeof sidebar.type !== 'string'
      ? React.cloneElement(sidebar as React.ReactElement<{ collapsed?: boolean }>, {
          collapsed: sidebarCollapsed,
        })
      : sidebar
    : null;

  return (
    <>
      {/* Offline Banner - shown when user is offline */}
      <OfflineBanner />

      <div data-app-shell className="flex h-full w-full overflow-hidden">
        {/* Desktop Sidebar - always rendered, width controlled by state */}
        {sidebar && (
          <aside
            data-sidebar
            className={cn(
              'relative flex-shrink-0 border-r border-border transition-all duration-300 ease-in-out',
              'hidden md:flex md:flex-col',
              sidebarOpen ? (sidebarCollapsed ? 'w-16' : '') : 'w-0 overflow-hidden'
            )}
            style={
              sidebarOpen && !sidebarCollapsed
                ? { width: 'var(--sidebar-width, 280px)' }
                : undefined
            }
          >
            {sidebarWithProps}

            {/* Collapse toggle button - positioned at the edge of sidebar */}
            {sidebarOpen && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        'absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border bg-background shadow-md',
                        'hover:bg-accent hover:text-accent-foreground',
                        'transition-transform duration-200'
                      )}
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                      {sidebarCollapsed ? (
                        <ChevronsRight className="h-3 w-3" />
                      ) : (
                        <ChevronsLeft className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </aside>
        )}

        {/* Main content */}
        <main
          ref={mainRef}
          className={cn(
            'flex flex-1 flex-col overflow-hidden',
            isMobile && 'pb-16' // Add padding for mobile bottom nav
          )}
        >
          {children}
        </main>

        {/* Network Status Indicator - fixed position at bottom right */}
        <div className={cn('fixed z-40', isMobile ? 'bottom-20 right-4' : 'bottom-4 right-4')}>
          <NetworkStatusIndicator showLabel />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </>
  );
}

export default AppShell;
