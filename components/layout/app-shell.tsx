'use client';

/**
 * AppShell - main application layout with sidebar and content area
 * Provides responsive layout with collapsible sidebar for desktop
 */

import React from 'react';
import { useUIStore, useSettingsStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function AppShell({ children, sidebar }: AppShellProps) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);

  // Clone sidebar element with collapsed prop
  const sidebarWithProps = sidebar
    ? React.cloneElement(sidebar as React.ReactElement<{ collapsed?: boolean }>, {
        collapsed: sidebarCollapsed,
      })
    : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar - always rendered, width controlled by state */}
      {sidebar && (
        <aside
          className={cn(
            'relative flex-shrink-0 border-r border-border bg-card transition-all duration-300 ease-in-out',
            'hidden md:flex md:flex-col',
            sidebarOpen
              ? sidebarCollapsed
                ? 'w-16'
                : 'w-64'
              : 'w-0 overflow-hidden'
          )}
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
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default AppShell;
