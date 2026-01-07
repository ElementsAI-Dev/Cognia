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
import { EmptyState } from '@/components/layout/empty-state';
import {
  Video,
  Search,
  Pin,
  Trash2,
  Play,
  X,
  RefreshCw,
  Folder,
  Clock,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
 * Format duration from milliseconds to HH:MM:SS
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    initialize,
    refreshHistory,
    deleteFromHistory,
    clearHistory,
  } = useScreenRecordingStore();

  const [searchQuery, setSearchQuery] = useState('');

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
          <EmptyState
            icon={Video}
            title={searchQuery ? t('noResultsFound') : t('noRecordings')}
            description={
              searchQuery
                ? t('tryDifferentQuery')
                : t('startRecordingToStart')
            }
            className="py-8"
          />
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
                    <div className="w-20 h-14 bg-muted rounded flex items-center justify-center shrink-0">
                      {recording.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/jpeg;base64,${recording.thumbnail}`}
                          alt="Recording thumbnail"
                          className="w-full h-full object-cover rounded"
                        />
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (recording.file_path) {
                                // TODO: Open folder containing file
                              }
                            }}
                          >
                            <Folder className="h-3.5 w-3.5" />
                          </Button>
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
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {history.length > 0 && (
        <div className="p-2 sm:p-3 border-t shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('recordingCount', { count: history.length })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={handleClearAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t('clearHistory')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordingHistoryPanel;
