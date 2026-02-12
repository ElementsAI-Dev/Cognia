'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AppWindow, Search, RefreshCw, Camera, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScreenshot, WindowInfo } from '@/hooks/native/use-screenshot';

interface WindowSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptureWindow?: (window: WindowInfo) => void;
}

export function WindowSelectorDialog({
  open,
  onOpenChange,
  onCaptureWindow,
}: WindowSelectorDialogProps) {
  const t = useTranslations('windowSelector');
  const { getWindowsWithThumbnails, captureWindowByHwnd, isCapturing } = useScreenshot();

  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWindow, setSelectedWindow] = useState<WindowInfo | null>(null);

  const fetchWindows = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getWindowsWithThumbnails(160);
      setWindows(result);
    } finally {
      setIsLoading(false);
    }
  }, [getWindowsWithThumbnails]);

  useEffect(() => {
    if (open) {
      fetchWindows();
      setSelectedWindow(null);
      setSearchQuery('');
    }
  }, [open, fetchWindows]);

  const filteredWindows = windows.filter((window) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      window.title.toLowerCase().includes(query) ||
      window.process_name.toLowerCase().includes(query)
    );
  });

  const handleSelectAndCapture = async () => {
    if (!selectedWindow) return;

    if (onCaptureWindow) {
      onCaptureWindow(selectedWindow);
    } else {
      await captureWindowByHwnd(selectedWindow.hwnd);
    }
    onOpenChange(false);
  };

  const handleDoubleClick = async (window: WindowInfo) => {
    setSelectedWindow(window);
    if (onCaptureWindow) {
      onCaptureWindow(window);
    } else {
      await captureWindowByHwnd(window.hwnd);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AppWindow className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={fetchWindows} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refresh')}</TooltipContent>
          </Tooltip>
        </div>

        <ScrollArea className="flex-1 min-h-0 border rounded-md">
          <div className="p-2 grid grid-cols-2 md:grid-cols-3 gap-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <WindowItemSkeleton key={i} />)
            ) : filteredWindows.length === 0 ? (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <AppWindow className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? t('noResultsFound') : t('noWindows')}</p>
              </div>
            ) : (
              filteredWindows.map((window) => (
                <WindowItem
                  key={window.hwnd}
                  window={window}
                  isSelected={selectedWindow?.hwnd === window.hwnd}
                  onClick={() => setSelectedWindow(window)}
                  onDoubleClick={() => handleDoubleClick(window)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {t('windowCount', { count: filteredWindows.length })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSelectAndCapture} disabled={!selectedWindow || isCapturing}>
              <Camera className="h-4 w-4 mr-2" />
              {isCapturing ? t('capturing') : t('capture')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WindowItemProps {
  window: WindowInfo;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

function WindowItem({ window, isSelected, onClick, onDoubleClick }: WindowItemProps) {
  return (
    <div
      className={cn(
        'group relative rounded-lg border p-2 cursor-pointer transition-all hover:bg-accent',
        isSelected && 'ring-2 ring-primary bg-accent'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="aspect-video bg-muted rounded overflow-hidden mb-2">
        {window.thumbnail_base64 ? (
          <Image
            src={`data:image/png;base64,${window.thumbnail_base64}`}
            alt={window.title}
            className="w-full h-full object-cover"
            width={160}
            height={90}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <AppWindow className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium truncate" title={window.title}>
          {window.title || 'Untitled'}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate" title={window.process_name}>
            {window.process_name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs px-1 py-0">
            {window.width}×{window.height}
          </Badge>
          {window.is_maximized && <Maximize2 className="h-3 w-3 text-muted-foreground" />}
          {window.is_minimized && <Minimize2 className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
          <Camera className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

function WindowItemSkeleton() {
  return (
    <div className="rounded-lg border p-2">
      <Skeleton className="aspect-video rounded mb-2" />
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
