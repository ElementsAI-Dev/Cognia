'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  useScreenshot,
  useScreenshotHistory,
  ScreenshotHistoryEntry,
  WindowInfo,
} from '@/hooks/native/use-screenshot';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { CopyButton } from '@/components/chat/ui/copy-button';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Camera,
  Monitor,
  Square,
  Search,
  Pin,
  PinOff,
  Trash2,
  Download,
  X,
  RefreshCw,
  FileText,
  AppWindow,
  Timer,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { WindowSelectorDialog } from './window-selector-dialog';
import { PlatformWarning, PlatformBadge } from '../platform/platform-warning';
import { ScreenshotEditor } from '@/components/screenshot/screenshot-editor';
import type { Annotation } from '@/types/screenshot';
import * as screenshotApi from '@/lib/native/screenshot';

interface ScreenshotPanelProps {
  className?: string;
  onScreenshotTaken?: (imageBase64: string) => void;
}

export function ScreenshotPanel({ className, onScreenshotTaken }: ScreenshotPanelProps) {
  const t = useTranslations('screenshotPanel');
  const {
    isCapturing,
    lastScreenshot,
    captureFullscreen,
    captureWindow,
    startRegionSelection,
    captureRegion,
    extractText,
    captureWindowByHwnd,
  } = useScreenshot();

  const {
    history,
    isLoading,
    fetchHistory,
    searchHistory,
    pinScreenshot,
    unpinScreenshot,
    deleteScreenshot,
    clearHistory,
  } = useScreenshotHistory();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScreenshotHistoryEntry[] | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [windowSelectorOpen, setWindowSelectorOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageData, setEditorImageData] = useState<string | null>(null);
  const [captureDelay, setCaptureDelay] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await searchHistory(searchQuery);
    setSearchResults(results);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const openEditor = useCallback((imageBase64: string) => {
    setEditorImageData(imageBase64);
    setEditorOpen(true);
  }, []);

  const withDelay = useCallback(async (fn: () => Promise<void>) => {
    if (captureDelay <= 0) {
      await fn();
      return;
    }
    for (let i = captureDelay; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(null);
    await fn();
  }, [captureDelay]);

  const handleEditorConfirm = useCallback(async (imageData: string, _annotations: Annotation[]) => {
    onScreenshotTaken?.(imageData);
    setEditorOpen(false);
    setEditorImageData(null);
    // Save annotated screenshot via native API
    try {
      const timestamp = Date.now();
      const filename = `screenshot_${timestamp}.png`;
      const { join, downloadDir } = await import('@tauri-apps/api/path');
      const dir = await downloadDir();
      const path = await join(dir, filename);
      await screenshotApi.saveToFile(imageData, path);
    } catch {
      // Save is best-effort; user already has the image via callback
    }
    fetchHistory();
  }, [onScreenshotTaken, fetchHistory]);

  const handleSendToChat = useCallback(async (imageData: string) => {
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('screenshot-send-to-chat', { imageBase64: imageData });
    } catch {
      // Fallback: copy to clipboard if event emission fails
      try {
        const response = await fetch(`data:image/png;base64,${imageData}`);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      } catch {
        // Best-effort
      }
    }
    setEditorOpen(false);
    setEditorImageData(null);
  }, []);

  const handleExtractText = useCallback(async (imageData: string) => {
    const text = await extractText(imageData);
    if (text) {
      navigator.clipboard.writeText(text);
      // Also emit to chat for convenience
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('screenshot-ocr-result', { text, imageBase64: imageData });
      } catch {
        // Best-effort
      }
    }
  }, [extractText]);

  const handleEditorCancel = useCallback(() => {
    setEditorOpen(false);
    setEditorImageData(null);
  }, []);

  const handleCaptureFullscreen = async () => {
    await withDelay(async () => {
      const result = await captureFullscreen();
      if (result) {
        openEditor(result.image_base64);
        fetchHistory();
      }
    });
  };

  const handleCaptureWindow = async () => {
    await withDelay(async () => {
      const result = await captureWindow();
      if (result) {
        openEditor(result.image_base64);
        fetchHistory();
      }
    });
  };

  const handleCaptureRegion = async () => {
    const region = await startRegionSelection();
    if (region) {
      await withDelay(async () => {
        const result = await captureRegion(region.x, region.y, region.width, region.height);
        if (result) {
          openEditor(result.image_base64);
          fetchHistory();
        }
      });
    }
  };

  const handleCaptureSelectedWindow = async (window: WindowInfo) => {
    const result = await captureWindowByHwnd(window.hwnd);
    if (result) {
      openEditor(result.image_base64);
      fetchHistory();
    }
  };

  const handleExtractTextFromLast = async () => {
    if (lastScreenshot) {
      const text = await extractText(lastScreenshot.image_base64);
      if (text) {
        navigator.clipboard.writeText(text);
      }
    }
  };

  const displayItems = searchResults ?? history;

  useEffect(() => {
    fetchHistory(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If editor is open, show it full-screen
  if (editorOpen && editorImageData) {
    return (
      <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-background', className)}>
        <ScreenshotEditor
          imageData={editorImageData}
          onConfirm={handleEditorConfirm}
          onCancel={handleEditorCancel}
          onSendToChat={handleSendToChat}
          onExtractText={handleExtractText}
          className="flex-1"
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/10">
            <Camera className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">{t('title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('screenshotCount', { count: history.length })}
            </p>
          </div>
        </div>
        <PlatformBadge platform="windows" />
      </div>

      {/* Actions */}
      <div className="p-3 border-b space-y-3 shrink-0">
        <PlatformWarning
          supportedPlatforms={['windows']}
          featureName={t('title')}
          mode="alert"
          className="mb-2"
        />

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4 animate-pulse" />
            <span>{t('captureIn')} {countdown}s...</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCaptureFullscreen}
            disabled={isCapturing}
            className="flex-1 min-w-[80px]"
          >
            <Monitor className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">{t('full')}</span>
            <span className="xs:hidden">F</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCaptureWindow}
            disabled={isCapturing}
            className="flex-1 min-w-[80px]"
          >
            <Square className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">{t('window')}</span>
            <span className="xs:hidden">W</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCaptureRegion}
            disabled={isCapturing}
            className="flex-1 min-w-[80px]"
          >
            <Square className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">{t('region')}</span>
            <span className="xs:hidden">R</span>
          </Button>
          <Select value={String(captureDelay)} onValueChange={(v) => setCaptureDelay(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]">
              <Timer className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t('noDelay')}</SelectItem>
              <SelectItem value="3">3s</SelectItem>
              <SelectItem value="5">5s</SelectItem>
              <SelectItem value="10">10s</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWindowSelectorOpen(true)}
            disabled={isCapturing}
            className="flex-1 min-w-[80px]"
          >
            <AppWindow className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">{t('selectWindow')}</span>
            <span className="xs:hidden">S</span>
          </Button>
        </div>
      </div>

      {lastScreenshot && (
        <div className="p-2 sm:p-3 border-b shrink-0">
          <Card>
            <CardContent className="p-2">
              <Image
                src={`data:image/png;base64,${lastScreenshot.image_base64}`}
                alt="Last screenshot"
                className="w-full h-32 object-contain bg-muted rounded"
                width={lastScreenshot.metadata.width}
                height={lastScreenshot.metadata.height}
                unoptimized
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {lastScreenshot.metadata.width}x{lastScreenshot.metadata.height}
                </span>
                <div className="flex gap-1">
                  <CopyButton content={lastScreenshot.image_base64} className="h-7 w-7" iconOnly />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleExtractTextFromLast}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `data:image/png;base64,${lastScreenshot.image_base64}`;
                      link.download = `screenshot-${Date.now()}.png`;
                      link.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2 p-2 sm:p-3 border-b shrink-0">
        <InputGroup className="flex-1">
          <InputGroupAddon align="inline-start">
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchQuery && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={handleClearSearch}
                aria-label={t('clearSearch')}
              >
                <X className="h-3 w-3" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchHistory()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('refresh')}</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {displayItems.map((item) => (
            <ScreenshotHistoryItem
              key={item.id}
              entry={item}
              isSelected={selectedScreenshot === item.id}
              onSelect={() => setSelectedScreenshot(item.id)}
              onPin={() => (item.is_pinned ? unpinScreenshot(item.id) : pinScreenshot(item.id))}
              onDelete={() => deleteScreenshot(item.id)}
            />
          ))}
          {displayItems.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={Camera}
                title={searchResults ? t('noResultsFound') : t('noHistory')}
                description={searchResults ? t('tryDifferentQuery') : t('takeScreenshotToStart')}
                compact
              />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t flex justify-between items-center shrink-0">
        <span className="text-xs text-muted-foreground">
          {t('screenshotCount', { count: history.length })}
        </span>
        <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs">
          {t('clearHistory')}
        </Button>
      </div>

      <WindowSelectorDialog
        open={windowSelectorOpen}
        onOpenChange={setWindowSelectorOpen}
        onCaptureWindow={handleCaptureSelectedWindow}
      />
    </div>
  );
}

interface ScreenshotHistoryItemProps {
  entry: ScreenshotHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function ScreenshotHistoryItem({
  entry,
  isSelected,
  onSelect,
  onPin,
  onDelete,
}: ScreenshotHistoryItemProps) {
  return (
    <div
      className={cn(
        'group relative rounded-md overflow-hidden border cursor-pointer',
        isSelected && 'ring-2 ring-primary',
        entry.is_pinned && 'border-yellow-500/50'
      )}
      onClick={onSelect}
    >
      {entry.thumbnail_base64 ? (
        <Image
          src={`data:image/png;base64,${entry.thumbnail_base64}`}
          alt={`Screenshot from ${new Date(entry.timestamp).toLocaleString()}`}
          className="w-full h-20 object-cover"
          width={160}
          height={80}
          unoptimized
        />
      ) : (
        <div className="w-full h-20 bg-muted flex items-center justify-center">
          <Camera className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
        >
          {entry.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-1.5 text-xs">
        <p className="text-muted-foreground">
          {entry.width}x{entry.height} · {entry.mode}
        </p>
        <p className="text-muted-foreground truncate">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {entry.is_pinned && (
        <div className="absolute top-1 right-1">
          <Pin className="h-3 w-3 text-yellow-500" />
        </div>
      )}
    </div>
  );
}
