'use client';

/**
 * Native Tools Page - Full-page view for native desktop tools
 * Provides access to clipboard history, screenshot, focus tracking, and context awareness
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clipboard,
  Camera,
  Monitor,
  Eye,
  Wrench,
  Activity,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardHistoryPanel,
  ScreenshotPanel,
  FocusTrackerPanel,
  ContextPanel,
  SystemMonitorPanel,
  SandboxPanel,
} from '@/components/native';
import { isTauri } from '@/lib/native/utils';

export default function NativeToolsPage() {
  const [activeTab, setActiveTab] = useState('clipboard');

  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return isTauri();
  }, []);

  if (!isDesktop) {
    return (
      <div className="flex h-svh flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Wrench className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Native Tools</h1>
          <p className="text-muted-foreground max-w-md">
            Native tools are only available in the desktop app. Download the desktop app to access clipboard history, screenshots, focus tracking, and context awareness.
          </p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          <h1 className="text-base font-semibold">Native Tools</h1>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-2 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full max-w-2xl grid-cols-6 shrink-0">
            <TabsTrigger value="clipboard" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Clipboard className="h-4 w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Clipboard</span>
            </TabsTrigger>
            <TabsTrigger value="screenshot" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Screenshot</span>
            </TabsTrigger>
            <TabsTrigger value="focus" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Focus</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Context</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">System</span>
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Sandbox</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-2 sm:mt-4 overflow-hidden min-h-0">
            <TabsContent value="clipboard" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full border rounded-lg overflow-hidden">
                <ClipboardHistoryPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="screenshot" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full border rounded-lg overflow-hidden">
                <ScreenshotPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="focus" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full border rounded-lg overflow-hidden">
                <FocusTrackerPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="context" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full border rounded-lg overflow-hidden">
                <ContextPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="system" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full border rounded-lg overflow-hidden">
                <SystemMonitorPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="sandbox" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full border rounded-lg overflow-hidden">
                <SandboxPanel className="h-full" />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
