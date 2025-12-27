'use client';

/**
 * NativeToolsSettings - Settings panel for native desktop tools
 * Provides access to clipboard history, screenshot, focus tracking, and context awareness
 */

import { useState } from 'react';
import {
  Clipboard,
  Camera,
  Monitor,
  Eye,
  Settings2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from '@/components/native';
import { isTauri } from '@/lib/native/utils';

export function NativeToolsSettings() {
  const [activeTab, setActiveTab] = useState('clipboard');
  const [clipboardHistoryEnabled, setClipboardHistoryEnabled] = useState(true);
  const [clipboardHistorySize, setClipboardHistorySize] = useState(100);
  const [screenshotOcrEnabled, setScreenshotOcrEnabled] = useState(true);
  const [focusTrackingEnabled, setFocusTrackingEnabled] = useState(false);
  const [contextRefreshInterval, setContextRefreshInterval] = useState(5);

  if (!isTauri()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Native Tools
          </CardTitle>
          <CardDescription>
            Native tools are only available in the desktop app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">
              Download the desktop app to access clipboard history, screenshots, focus tracking, and context awareness.
            </p>
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
            Native Tools
          </CardTitle>
          <CardDescription>
            Configure clipboard history, screenshots, focus tracking, and context awareness.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="clipboard" className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5">
                <Clipboard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">Clipboard</span>
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5">
                <Camera className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">Screenshot</span>
              </TabsTrigger>
              <TabsTrigger value="focus" className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5">
                <Monitor className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">Focus</span>
              </TabsTrigger>
              <TabsTrigger value="context" className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5">
                <Eye className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline text-xs">Context</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clipboard" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Clipboard History</Label>
                  <p className="text-xs text-muted-foreground">
                    Track clipboard changes and maintain history
                  </p>
                </div>
                <Switch
                  checked={clipboardHistoryEnabled}
                  onCheckedChange={setClipboardHistoryEnabled}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>History Size</Label>
                  <span className="text-sm text-muted-foreground">
                    {clipboardHistorySize} items
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

              <div className="h-[300px] sm:h-[400px] border rounded-lg overflow-hidden">
                <ClipboardHistoryPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="screenshot" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable OCR</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically extract text from screenshots
                  </p>
                </div>
                <Switch
                  checked={screenshotOcrEnabled}
                  onCheckedChange={setScreenshotOcrEnabled}
                />
              </div>

              <Separator />

              <div className="h-[300px] sm:h-[400px] border rounded-lg overflow-hidden">
                <ScreenshotPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="focus" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Focus Tracking</Label>
                  <p className="text-xs text-muted-foreground">
                    Track which applications you use and for how long
                  </p>
                </div>
                <Switch
                  checked={focusTrackingEnabled}
                  onCheckedChange={setFocusTrackingEnabled}
                />
              </div>

              <Separator />

              <div className="h-[300px] sm:h-[400px] border rounded-lg overflow-hidden">
                <FocusTrackerPanel className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="context" className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Refresh Interval</Label>
                  <span className="text-sm text-muted-foreground">
                    {contextRefreshInterval} seconds
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

              <div className="h-[300px] sm:h-[400px] border rounded-lg overflow-hidden">
                <ContextPanel className="h-full" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
