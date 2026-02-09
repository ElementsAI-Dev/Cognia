'use client';

import {
  Film,
  MoreHorizontal,
  Pin,
  Trash2,
  FolderOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, formatDuration } from '@/lib/utils';
import type { RecordingHistoryEntry } from '@/lib/native/screen-recording';

export interface RecordingSidebarProps {
  history: RecordingHistoryEntry[];
  selectedRecording: RecordingHistoryEntry | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectRecording: (entry: RecordingHistoryEntry) => void;
  onDeleteClick: (id: string) => void;
  onOpenFolder?: (entry: RecordingHistoryEntry) => void;
  onCloseSidebar?: () => void;
  t: (key: string) => string;
}

export function RecordingSidebar({
  history,
  selectedRecording,
  searchQuery,
  onSearchChange,
  onSelectRecording,
  onDeleteClick,
  onOpenFolder,
  onCloseSidebar,
  t,
}: RecordingSidebarProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 sm:p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">{t('recordings')}</h2>
          {onCloseSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:hidden"
              onClick={onCloseSidebar}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Input
          placeholder={t('searchRecordings')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8"
        />
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {history.length === 0 ? (
            <Empty className="py-8 border-0">
              <EmptyMedia variant="icon">
                <Film className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle className="text-sm text-muted-foreground">{t('noRecordings')}</EmptyTitle>
            </Empty>
          ) : (
            history.map((entry) => (
              <Card
                key={entry.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-accent",
                  selectedRecording?.id === entry.id && "ring-2 ring-primary"
                )}
                onClick={() => onSelectRecording(entry)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-10 bg-muted rounded flex items-center justify-center shrink-0 overflow-hidden">
                      {entry.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/png;base64,${entry.thumbnail}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px] h-4">
                          {entry.mode}
                        </Badge>
                        {entry.is_pinned && (
                          <Pin className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDuration(entry.duration_ms)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>{t('actions')}</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        {onOpenFolder && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onOpenFolder(entry);
                          }}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {t('openFolder')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClick(entry.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
