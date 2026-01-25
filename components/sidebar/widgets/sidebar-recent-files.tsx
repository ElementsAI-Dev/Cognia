'use client';

/**
 * SidebarRecentFiles - Recent files widget for sidebar
 */

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileImage,
  FileAudio,
  FileVideo,
  File,
  FileText,
  ChevronDown,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRecentFilesStore, type RecentFile } from '@/stores/system/recent-files-store';
import { cn } from '@/lib/utils';

interface SidebarRecentFilesProps {
  className?: string;
  collapsed?: boolean;
  defaultOpen?: boolean;
  limit?: number;
  onFileClick?: (file: RecentFile) => void;
}

const FILE_TYPE_ICONS: Record<RecentFile['type'], React.ReactNode> = {
  image: <FileImage className="h-3.5 w-3.5" />,
  audio: <FileAudio className="h-3.5 w-3.5" />,
  video: <FileVideo className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  file: <File className="h-3.5 w-3.5" />,
};

const FILE_TYPE_COLORS: Record<RecentFile['type'], string> = {
  image: 'text-pink-500',
  audio: 'text-purple-500',
  video: 'text-red-500',
  document: 'text-blue-500',
  file: 'text-muted-foreground',
};

export function SidebarRecentFiles({
  className,
  collapsed,
  defaultOpen = false,
  limit = 5,
  onFileClick,
}: SidebarRecentFilesProps) {
  const t = useTranslations('sidebar');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const getRecentFiles = useRecentFilesStore((state) => state.getRecentFiles);
  const removeFile = useRecentFilesStore((state) => state.removeFile);
  const updateFileUsage = useRecentFilesStore((state) => state.updateFileUsage);

  const recentFiles = useMemo(() => getRecentFiles(limit), [getRecentFiles, limit]);

  const handleFileClick = useCallback(
    (file: RecentFile) => {
      updateFileUsage(file.id);
      onFileClick?.(file);
      if (!onFileClick && file.url) {
        window.open(file.url, '_blank', 'noreferrer');
      }
    },
    [onFileClick, updateFileUsage]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (recentFiles.length === 0) {
    return null;
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center justify-center p-2 rounded-md',
              'text-muted-foreground',
              className
            )}
          >
            <div className="relative">
              <Clock className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {recentFiles.length}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-sm">
            <p className="font-medium">{t('recentFiles') || 'Recent Files'}</p>
            <p className="text-muted-foreground">
              {t('filesCount', { count: recentFiles.length }) || `${recentFiles.length} files`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors group">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          {t('recentFiles') || 'Recent Files'}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px] bg-muted px-1 rounded">{recentFiles.length}</span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pt-1 pb-2">
        <div className="space-y-0.5">
          {recentFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded-md',
                'bg-card/20 supports-[backdrop-filter]:bg-card/10 hover:bg-accent/50 transition-colors cursor-pointer'
              )}
              onClick={() => handleFileClick(file)}
            >
              <span className={FILE_TYPE_COLORS[file.type]}>{FILE_TYPE_ICONS[file.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default SidebarRecentFiles;
