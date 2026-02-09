'use client';

/**
 * Recording History Panel
 *
 * Displays and manages screen recording history
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useScreenRecordingStore } from '@/stores/media';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Video,
  Search,
  Pin,
  PinOff,
  Trash2,
  Play,
  X,
  RefreshCw,
  Folder,
  Clock,
  HardDrive,
  Tag,
  Plus,
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { isTauri } from '@/lib/native/utils';
import { RecordingControls } from './recording-controls';

interface RecordingHistoryPanelProps {
  className?: string;
  onRecordingSelect?: (filePath: string) => void;
}

/**
 * Format file size to human readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

export function RecordingHistoryPanel({
  className,
  onRecordingSelect,
}: RecordingHistoryPanelProps) {
  const t = useTranslations('recordingHistory');

  const {
    history,
    isInitialized,
    isLoading,
    storageStats,
    storageUsagePercent,
    isStorageExceeded,
    initialize,
    refreshHistory,
    refreshStorageStats,
    deleteFromHistory,
    clearHistory,
    runStorageCleanup,
    pinRecording,
    unpinRecording,
    addTag,
    removeTag,
    openRecordingFolder,
  } = useScreenRecordingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [tagInputId, setTagInputId] = useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = useState('');

  // Filter history based on search using useMemo
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) {
      return history;
    }
    const query = searchQuery.toLowerCase();
    return history.filter(
      (item) =>
        item.mode.toLowerCase().includes(query) ||
        item.file_path?.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [history, searchQuery]);

  // Initialize on mount
  useEffect(() => {
    if (isTauri() && !isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Refresh storage stats periodically when component is visible
  useEffect(() => {
    if (!isTauri() || !isInitialized) return;
    
    // Initial refresh
    refreshStorageStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      refreshStorageStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isInitialized, refreshStorageStats]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleRefresh = () => {
    refreshHistory();
  };

  const handleOpenFile = (filePath?: string) => {
    if (filePath) {
      onRecordingSelect?.(filePath);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFromHistory(id);
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    if (isPinned) {
      await unpinRecording(id);
    } else {
      await pinRecording(id);
    }
  };

  const handleOpenFolder = async (filePath?: string) => {
    if (filePath) {
      await openRecordingFolder(filePath);
    }
  };

  const handleAddTag = async (id: string) => {
    const tag = tagInputValue.trim();
    if (tag) {
      await addTag(id, tag);
      setTagInputValue('');
      setTagInputId(null);
    }
  };

  const handleRemoveTag = async (id: string, tag: string) => {
    await removeTag(id, tag);
  };

  const handleClearAll = async () => {
    await clearHistory();
  };

  // Not available in web
  if (!isTauri()) {
    return (
      <div className={cn('flex flex-col h-full items-center justify-center p-4', className)}>
        <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground text-center">
          {t('desktopOnly')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      {/* Header with controls */}
      <div className="p-2 sm:p-3 border-b space-y-2 sm:space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            <span className="font-medium">{t('title')}</span>
          </div>
          <RecordingControls compact />
        </div>

        {/* Search and actions */}
        <div className="flex gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <Search className="h-4 w-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-8"
            />
            {searchQuery && (
              <InputGroupButton
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3" />
              </InputGroupButton>
            )}
          </InputGroup>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Recording list */}
      <ScrollArea className="flex-1">
        {filteredHistory.length === 0 ? (
          <Empty className="py-8 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Video className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery ? t('noResultsFound') : t('noRecordings')}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? t('tryDifferentQuery')
                  : t('startRecordingToStart')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="p-2 sm:p-3 space-y-2">
            {filteredHistory.map((recording) => (
              <Card
                key={recording.id}
                className="group hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => handleOpenFile(recording.file_path)}
              >
                <CardContent className="p-2 sm:p-3">
                  <div className="flex gap-3">
                    {/* Thumbnail placeholder */}
                    <div className="w-20 h-14 bg-muted rounded flex items-center justify-center shrink-0 relative overflow-hidden">
                      {recording.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/jpeg;base64,${recording.thumbnail}`}
                          alt="Recording thumbnail"
                          className="w-full h-full object-cover rounded"
                        />
                      ) : isLoading ? (
                        <Skeleton className="w-full h-full absolute inset-0" />
                      ) : (
                        <Video className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Recording info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {recording.mode}
                            </Badge>
                            {recording.is_pinned && (
                              <Pin className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(recording.duration_ms)}</span>
                            <span>•</span>
                            <HardDrive className="h-3 w-3" />
                            <span>{formatFileSize(recording.file_size)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {formatRelativeTime(recording.timestamp)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenFile(recording.file_path);
                                }}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('play')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenFolder(recording.file_path);
                                }}
                              >
                                <Folder className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('openFolder')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn('h-7 w-7', recording.is_pinned && 'text-primary')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePin(recording.id, recording.is_pinned);
                                }}
                              >
                                {recording.is_pinned ? (
                                  <PinOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Pin className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {recording.is_pinned ? t('unpin') : t('pin')}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(recording.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('delete')}</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Tags */}
                  {(recording.tags.length > 0 || tagInputId === recording.id) && (
                    <div className="flex flex-wrap items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                      {recording.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs h-5 gap-1 cursor-default"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                          <button
                            className="ml-0.5 hover:text-destructive"
                            onClick={() => handleRemoveTag(recording.id, tag)}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      {tagInputId === recording.id && (
                        <input
                          autoFocus
                          className="h-5 w-20 text-xs bg-transparent border border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring"
                          value={tagInputValue}
                          onChange={(e) => setTagInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag(recording.id);
                            if (e.key === 'Escape') { setTagInputId(null); setTagInputValue(''); }
                          }}
                          onBlur={() => { setTagInputId(null); setTagInputValue(''); }}
                          placeholder="tag..."
                        />
                      )}
                    </div>
                  )}
                  {/* Add tag button (shown on hover) */}
                  {tagInputId !== recording.id && (
                    <button
                      className="mt-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagInputId(recording.id);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      {t('addTag')}
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer with Storage Stats */}
      {history.length > 0 && (
        <div className="p-2 sm:p-3 border-t shrink-0 space-y-2">
          {/* Storage Usage Bar */}
          {storageStats && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  <span>
                    {formatFileSize(storageStats.recordingsSize + storageStats.screenshotsSize)}
                  </span>
                </div>
                <span className={cn(
                  isStorageExceeded && 'text-destructive font-medium'
                )}>
                  {storageUsagePercent.toFixed(0)}% {t('used')}
                </span>
              </div>
              <Progress
                value={Math.min(storageUsagePercent, 100)}
                className={cn(
                  "h-1.5",
                  isStorageExceeded && "[&>div]:bg-destructive"
                )}
              />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('recordingCount', { count: history.length })}
            </span>
            <div className="flex items-center gap-1">
              {isStorageExceeded && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () => {
                    const result = await runStorageCleanup();
                    if (result && result.filesDeleted > 0) {
                      // Optionally show a toast notification
                      console.log(`Cleaned up ${result.filesDeleted} files, freed ${formatFileSize(result.bytesFreed)}`);
                    }
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('cleanup')}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t('clearHistory')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmClearTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('confirmClearDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordingHistoryPanel;
