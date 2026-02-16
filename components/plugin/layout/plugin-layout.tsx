'use client';

/**
 * PluginLayout - Unified layout container for plugin management page
 * Supports sidebar + main content area with responsive design
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

interface PluginLayoutProps {
  /** Sidebar component */
  sidebar?: React.ReactNode;
  /** Header component */
  header?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether sidebar is collapsed */
  sidebarCollapsed?: boolean;
  /** Whether to show sidebar on mobile */
  showMobileSidebar?: boolean;
  /** Called when the mobile sidebar overlay is clicked (to close sidebar) */
  onCloseMobileSidebar?: () => void;
}

export function PluginLayout({
  sidebar,
  header,
  children,
  className,
  sidebarCollapsed = false,
  showMobileSidebar = false,
  onCloseMobileSidebar,
}: PluginLayoutProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex h-full w-full overflow-hidden',
          'bg-background',
          className
        )}
      >
        {/* Sidebar - Hidden on mobile, visible on tablet/desktop */}
        {sidebar && (
          <aside
            className={cn(
              'shrink-0 border-r transition-all duration-300 ease-in-out',
              // Mobile: hidden by default, can be shown via showMobileSidebar
              'hidden sm:block',
              showMobileSidebar && 'fixed inset-y-0 left-0 z-50 block',
              // Tablet: icon mode (64px)
              'sm:w-16',
              // Desktop: full width (220px) when not collapsed
              sidebarCollapsed ? 'lg:w-16' : 'lg:w-56',
              // Backdrop for mobile
              showMobileSidebar && 'bg-background shadow-xl'
            )}
          >
            {sidebar}
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            aria-hidden="true"
            onClick={onCloseMobileSidebar}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCloseMobileSidebar?.();
            }}
            role="button"
            tabIndex={-1}
          />
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Header */}
          {header && (
            <div className="shrink-0">
              {header}
            </div>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default PluginLayout;
