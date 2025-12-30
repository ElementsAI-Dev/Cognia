'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useScreenshot, useScreenshotHistory, ScreenshotHistoryEntry } from '@/hooks/use-screenshot';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenshotPanelProps {
  className?: string;
  onScreenshotTaken?: (imageBase64: string) => void;
}

export function ScreenshotPanel({
  className,
  onScreenshotTaken,
}: ScreenshotPanelProps) {
  const t = useTranslations('screenshotPanel');
  const {
    isCapturing,
    lastScreenshot,
    captureFullscreen,
    captureWindow,
    startRegionSelection,
    captureRegion,
    extractText,
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

  const handleCaptureFullscreen = async () => {
    const result = await captureFullscreen();
    if (result) {
      onScreenshotTaken?.(result.image_base64);
      fetchHistory();
    }
  };

  const handleCaptureWindow = async () => {
    const result = await captureWindow();
    if (result) {
      onScreenshotTaken?.(result.image_base64);
      fetchHistory();
    }
  };

  const handleCaptureRegion = async () => {
    const region = await startRegionSelection();
    if (region) {
      const result = await captureRegion(region.x, region.y, region.width, region.height);
      if (result) {
        onScreenshotTaken?.(result.image_base64);
        fetchHistory();
      }
    }
  };

  const handleExtractText = async () => {
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

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="p-2 sm:p-3 border-b space-y-2 sm:space-y-3 shrink-0">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <span className="font-medium">{t('title')}</span>
        </div>
        
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
                  <CopyButton
                    content={lastScreenshot.image_base64}
                    className="h-7 w-7"
                    iconOnly
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleExtractText}
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
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchHistory()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {displayItems.map((item) => (
            <ScreenshotHistoryItem
              key={item.id}
              entry={item}
              isSelected={selectedScreenshot === item.id}
              onSelect={() => setSelectedScreenshot(item.id)}
              onPin={() => item.is_pinned ? unpinScreenshot(item.id) : pinScreenshot(item.id)}
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
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-xs"
        >
          {t('clearHistory')}
        </Button>
      </div>
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
          {entry.is_pinned ? (
            <PinOff className="h-3.5 w-3.5" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
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
