'use client';

/**
 * Native Tools Page - Full-page view for native desktop tools
 * Provides access to clipboard history, screenshot, focus tracking, and context awareness
 * 
 * Layout:
 * - Desktop (lg+): Sidebar navigation + content area
 * - Mobile/Tablet (<lg): Full content + bottom scrollable navigation
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Wrench, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ClipboardHistoryPanel,
  ClipboardContextPanel,
  ClipboardTemplatesPanel,
  ScreenshotPanel,
  FocusTrackerPanel,
  ContextPanel,
  SystemMonitorPanel,
  SandboxPanel,
  LocationPanel,
  ProcessPanel,
  NativeToolSidebar,
  NativeToolMobileNav,
  NATIVE_TOOLS,
} from '@/components/native';
import { isTauri } from '@/lib/native/utils';
import { cn } from '@/lib/utils';

export default function NativeToolsPage() {
  const t = useTranslations('nativeToolsPage');
  const [activeTab, setActiveTab] = useState('clipboard');

  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return isTauri();
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const activeTool = useMemo(() => {
    return NATIVE_TOOLS.find((tool) => tool.id === activeTab);
  }, [activeTab]);

  if (!isDesktop) {
    return (
      <div className="flex h-svh flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Wrench className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('desktopOnlyMessage')}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="lg" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('backToChat')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('backToChat')}</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">{t('title')}</h1>
              {activeTool && (
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  {t(`tabs.${activeTool.labelKey}`)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/settings/native-tools">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile/tablet */}
        <NativeToolSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          className="hidden lg:flex"
        />

        {/* Content Panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-3 sm:p-4 lg:p-6">
            <div
              className={cn(
                'h-full rounded-xl border bg-card shadow-sm overflow-hidden',
                'transition-all duration-300 ease-in-out',
                'animate-in fade-in-0 slide-in-from-right-2'
              )}
              key={activeTab}
            >
              {activeTab === 'clipboard' && <ClipboardHistoryPanel className="h-full" />}
              {activeTab === 'clipboard-context' && <ClipboardContextPanel className="h-full" />}
              {activeTab === 'templates' && <ClipboardTemplatesPanel className="h-full" />}
              {activeTab === 'screenshot' && <ScreenshotPanel className="h-full" />}
              {activeTab === 'focus' && <FocusTrackerPanel className="h-full" />}
              {activeTab === 'context' && <ContextPanel className="h-full" />}
              {activeTab === 'location' && <LocationPanel className="h-full" />}
              {activeTab === 'system' && <SystemMonitorPanel className="h-full" />}
              {activeTab === 'processes' && <ProcessPanel className="h-full" />}
              {activeTab === 'sandbox' && <SandboxPanel className="h-full" />}
            </div>
          </div>

          {/* Mobile/Tablet Bottom Navigation - Hidden on desktop */}
          <NativeToolMobileNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="lg:hidden"
          />
        </main>
      </div>
    </div>
  );
}
