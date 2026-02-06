'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useClipboardHistory, ClipboardEntry } from '@/hooks/ui';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/layout/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Copy,
  Pin,
  PinOff,
  Trash2,
  Search,
  Image as ImageIcon,
  FileText,
  File,
  X,
  RefreshCw,
  Clipboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipboardHistoryPanelProps {
  className?: string;
  onSelect?: (entry: ClipboardEntry) => void;
}

export function ClipboardHistoryPanel({ className, onSelect }: ClipboardHistoryPanelProps) {
  const t = useTranslations('clipboardPanel');
  const {
    history,
    pinnedItems,
    isLoading,
    fetchHistory,
    searchHistory,
    pinEntry,
    unpinEntry,
    deleteEntry,
    copyEntry,
    clearUnpinned,
    checkAndUpdate,
  } = useClipboardHistory();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClipboardEntry[] | null>(null);

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

  const displayItems = searchResults ?? history;

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndUpdate();
    }, 2000);
    return () => clearInterval(interval);
  }, [checkAndUpdate]);

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Clipboard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">
              {t('title') || 'Clipboard History'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('itemCount', { count: history.length })}
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchHistory()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('refresh')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 p-3 border-b shrink-0">
        <InputGroup className="flex-1">
          <InputGroupAddon align="inline-start">
            <Search className="h-4 w-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9"
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
      </div>

      {pinnedItems.length > 0 && !searchResults && (
        <div className="p-2 border-b">
          <div className="text-xs font-medium text-muted-foreground mb-2">{t('pinned')}</div>
          <div className="space-y-1">
            {pinnedItems.map((item) => (
              <ClipboardItem
                key={item.id}
                entry={item}
                onCopy={() => copyEntry(item.id)}
                onPin={() => unpinEntry(item.id)}
                onDelete={() => deleteEntry(item.id)}
                onSelect={() => onSelect?.(item)}
                isPinned
              />
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {displayItems
            .filter((item) => !item.is_pinned)
            .map((item) => (
              <ClipboardItem
                key={item.id}
                entry={item}
                onCopy={() => copyEntry(item.id)}
                onPin={() => pinEntry(item.id)}
                onDelete={() => deleteEntry(item.id)}
                onSelect={() => onSelect?.(item)}
              />
            ))}
          {displayItems.length === 0 && (
            <EmptyState
              icon={Clipboard}
              title={searchResults ? t('noResultsFound') : t('noHistory')}
              description={searchResults ? t('tryDifferentQuery') : t('copyToStart')}
              compact
            />
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-muted/20 flex justify-end items-center shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearUnpinned}
          className="text-xs h-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          {t('clearUnpinned')}
        </Button>
      </div>
    </div>
  );
}

interface ClipboardItemProps {
  entry: ClipboardEntry;
  onCopy: () => void;
  onPin: () => void;
  onDelete: () => void;
  onSelect?: () => void;
  isPinned?: boolean;
}

function ClipboardItem({ entry, onCopy, onPin, onDelete, onSelect, isPinned }: ClipboardItemProps) {
  const getContentTypeIcon = (type: ClipboardEntry['content_type']) => {
    switch (type) {
      case 'Image':
        return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
      case 'Files':
        return <File className="h-4 w-4" aria-hidden="true" />;
      default:
        return <FileText className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const getContentTypeBg = (type: ClipboardEntry['content_type']) => {
    switch (type) {
      case 'Image':
        return 'bg-purple-500/10 text-purple-500';
      case 'Files':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg cursor-pointer',
        'border border-transparent transition-all duration-200',
        'hover:bg-muted/50 hover:border-border/50',
        isPinned && 'bg-amber-500/5 border-amber-500/20'
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-md shrink-0',
          getContentTypeBg(entry.content_type)
        )}
      >
        {getContentTypeIcon(entry.content_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.preview}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(entry.timestamp).toLocaleTimeString()}
          {entry.source_app && ` · ${entry.source_app}`}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Copy</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Delete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
