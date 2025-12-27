'use client';

import { useState, useEffect } from 'react';
import { useClipboardHistory, ClipboardEntry } from '@/hooks/use-selection-history';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipboardHistoryPanelProps {
  className?: string;
  onSelect?: (entry: ClipboardEntry) => void;
}

export function ClipboardHistoryPanel({
  className,
  onSelect,
}: ClipboardHistoryPanelProps) {
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
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="flex items-center gap-2 p-2 sm:p-3 border-b shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clipboard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-8 pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={handleClearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchHistory()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {pinnedItems.length > 0 && !searchResults && (
        <div className="p-2 border-b">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Pinned
          </div>
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
          {displayItems.filter(item => !item.is_pinned).map((item) => (
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
            <div className="text-center text-muted-foreground py-8">
              {searchResults ? 'No results found' : 'No clipboard history'}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t flex justify-between items-center shrink-0">
        <span className="text-xs text-muted-foreground">
          {history.length} items
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearUnpinned}
          className="text-xs"
        >
          Clear unpinned
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

function ClipboardItem({
  entry,
  onCopy,
  onPin,
  onDelete,
  onSelect,
  isPinned,
}: ClipboardItemProps) {
  const getContentTypeIcon = (type: ClipboardEntry['content_type']) => {
    switch (type) {
      case 'Image':
        return <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
      case 'Files':
        return <File className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer',
        isPinned && 'bg-muted/30'
      )}
      onClick={onSelect}
    >
      <div className="mt-0.5">{getContentTypeIcon(entry.content_type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{entry.preview}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(entry.timestamp).toLocaleTimeString()}
          {entry.source_app && ` · ${entry.source_app}`}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
        >
          {isPinned ? (
            <PinOff className="h-3.5 w-3.5" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
