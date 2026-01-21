'use client';

/**
 * NativeToolsSettings - Settings panel for native desktop tools
 * Provides access to clipboard history, screenshot, screen recording, focus tracking, and context awareness
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Clipboard,
  Camera,
  Monitor,
  Eye,
  Settings2,
  Activity,
  Terminal,
  Video,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardHistoryPanel,
  ScreenshotPanel,
  FocusTrackerPanel,
  ContextPanel,
  SystemMonitorPanel,
  SandboxPanel,
} from '@/components/native';
import { RecordingHistoryPanel } from '@/components/screen-recording';
import { isTauri } from '@/lib/native/utils';
import { useNativeStore } from '@/stores/system';

export function NativeToolsSettings() {
  const t = useTranslations('nativeToolsSettings');

  const [activeTab, setActiveTab] = useState('clipboard');

  // Persisted native tools configuration
  const nativeToolsConfig = useNativeStore((state) => state.nativeToolsConfig);
  const setNativeToolsConfig = useNativeStore((state) => state.setNativeToolsConfig);

  const clipboardHistoryEnabled = nativeToolsConfig.clipboardHistoryEnabled;
  const clipboardHistorySize = nativeToolsConfig.clipboardHistorySize;
  const screenshotOcrEnabled = nativeToolsConfig.screenshotOcrEnabled;
  const focusTrackingEnabled = nativeToolsConfig.focusTrackingEnabled;
  const contextRefreshInterval = nativeToolsConfig.contextRefreshInterval;

  const setClipboardHistoryEnabled = (enabled: boolean) =>
    setNativeToolsConfig({ clipboardHistoryEnabled: enabled });
  const setClipboardHistorySize = (size: number) =>
    setNativeToolsConfig({ clipboardHistorySize: size });
  const setScreenshotOcrEnabled = (enabled: boolean) =>
    setNativeToolsConfig({ screenshotOcrEnabled: enabled });
  const setFocusTrackingEnabled = (enabled: boolean) =>
    setNativeToolsConfig({ focusTrackingEnabled: enabled });
  const setContextRefreshInterval = (interval: number) =>
    setNativeToolsConfig({ contextRefreshInterval: interval });

  if (!isTauri()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('notAvailable')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">{t('downloadHint')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 h-auto">
              <TabsTrigger
                value="clipboard"
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5"
              >
                <Clipboard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">{t('clipboard')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="screenshot"
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5"
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">{t('screenshot')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="recording"
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5"
              >
                <Video className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">{t('recording')}</span>
              </TabsTrigger>
              <TabsTrigger value="focus" className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5">
                <Monitor className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">{t('focus')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="context"
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5"
              >
                <Eye className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">{t('context')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5"
              >
                <Activity className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">{t('system')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="sandbox"
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5"
              >
                <Terminal className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">{t('sandbox')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clipboard" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('enableClipboardHistory')}</Label>
                  <p className="text-xs text-muted-foreground">{t('enableClipboardHistoryDesc')}</p>
                </div>
                <Switch
                  checked={clipboardHistoryEnabled}
                  onCheckedChange={setClipboardHistoryEnabled}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('historySize')}</Label>
                  <span className="text-sm text-muted-foreground">
                    {clipboardHistorySize} {t('items')}
                  </span>
                </div>
                <Slider
                  value={[clipboardHistorySize]}
                  onValueChange={([value]) => setClipboardHistorySize(value)}
                  min={10}
                  max={500}
                  step={10}
                />
              </div>

              <Separator />

              <div className="h-75 sm:h-100 border rounded-lg overflow-hidden">
                <ClipboardHistoryPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="screenshot" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('enableOcr')}</Label>
                  <p className="text-xs text-muted-foreground">{t('enableOcrDesc')}</p>
                </div>
                <Switch checked={screenshotOcrEnabled} onCheckedChange={setScreenshotOcrEnabled} />
              </div>

              <Separator />

              <div className="h-75 sm:h-100 border rounded-lg overflow-hidden">
                <ScreenshotPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="recording" className="mt-4 space-y-4">
              <div className="h-75 sm:h-100 border rounded-lg overflow-hidden">
                <RecordingHistoryPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="focus" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('enableFocusTracking')}</Label>
                  <p className="text-xs text-muted-foreground">{t('enableFocusTrackingDesc')}</p>
                </div>
                <Switch checked={focusTrackingEnabled} onCheckedChange={setFocusTrackingEnabled} />
              </div>

              <Separator />

              <div className="h-75 sm:h-100 border rounded-lg overflow-hidden">
                <FocusTrackerPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="context" className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('refreshInterval')}</Label>
                  <span className="text-sm text-muted-foreground">
                    {contextRefreshInterval} {t('seconds')}
                  </span>
                </div>
                <Slider
                  value={[contextRefreshInterval]}
                  onValueChange={([value]) => setContextRefreshInterval(value)}
                  min={1}
                  max={30}
                  step={1}
                />
              </div>

              <Separator />

              <div className="h-75 sm:h-100 border rounded-lg overflow-hidden">
                <ContextPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="system" className="mt-4 space-y-4">
              <div className="h-75 sm:h-100 border rounded-lg overflow-hidden">
                <SystemMonitorPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="sandbox" className="mt-4 space-y-4">
              <div className="h-75 sm:h-100 border rounded-lg overflow-hidden">
                <SandboxPanel className="h-full" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
