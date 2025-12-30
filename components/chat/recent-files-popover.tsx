'use client';

/**
 * RecentFilesPopover - Quick file insertion from recent files
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  FileIcon,
  ImageIcon,
  FileText,
  X,
  Search,
  Trash2,
} from 'lucide-react';
import { useRecentFilesStore, type RecentFile } from '@/stores/recent-files-store';
import { cn } from '@/lib/utils';

interface RecentFilesPopoverProps {
  onSelectFile: (file: RecentFile) => void;
  disabled?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTimeAgo(date: Date, t: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

function getFileIcon(type: RecentFile['type']) {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    case 'document':
      return <FileText className="h-4 w-4 text-orange-500" />;
    default:
      return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  }
}

export function RecentFilesPopover({
  onSelectFile,
  disabled = false,
  className,
}: RecentFilesPopoverProps) {
  const t = useTranslations('recentFilesPopover');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const recentFiles = useRecentFilesStore((state) => state.recentFiles);
  const getRecentFiles = useRecentFilesStore((state) => state.getRecentFiles);
  const searchFiles = useRecentFilesStore((state) => state.searchFiles);
  const removeFile = useRecentFilesStore((state) => state.removeFile);
  const clearFiles = useRecentFilesStore((state) => state.clearFiles);

  const displayedFiles = searchQuery
    ? searchFiles(searchQuery)
    : getRecentFiles(20);

  const handleSelectFile = useCallback(
    (file: RecentFile) => {
      onSelectFile(file);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onSelectFile]
  );

  const handleRemoveFile = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      removeFile(id);
    },
    [removeFile]
  );

  const handleClearAll = useCallback(() => {
    clearFiles();
  }, [clearFiles]);

  if (recentFiles.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', className)}
          disabled={disabled}
        >
          <History className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {displayedFiles.length > 0 ? (
              displayedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer group"
                  onClick={() => handleSelectFile(file)}
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {formatTimeAgo(file.usedAt, t)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleRemoveFile(e, file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? t('noFilesFound') : t('noRecentFiles')}
              </div>
            )}
          </div>
        </ScrollArea>

        {recentFiles.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-destructive"
              onClick={handleClearAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t('clearAll')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default RecentFilesPopover;
