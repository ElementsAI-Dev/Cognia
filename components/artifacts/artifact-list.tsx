'use client';

/**
 * ArtifactList - Displays a list of artifacts for the current session
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Code, Search, Filter, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useArtifactStore, useSessionStore } from '@/stores';
import type { Artifact, ArtifactType } from '@/types';
import { ARTIFACT_TYPE_KEYS, PREVIEWABLE_TYPES } from '@/lib/artifacts';
import { getArtifactTypeIcon, ARTIFACT_TYPE_ICONS } from './artifact-icons';

interface ArtifactListProps {
  sessionId?: string;
  className?: string;
  maxHeight?: string;
  onArtifactClick?: (artifact: Artifact) => void;
}

// Use centralized type label keys
const TYPE_LABEL_KEYS = ARTIFACT_TYPE_KEYS;

const ARTIFACT_TYPES: ArtifactType[] = ['code', 'document', 'svg', 'html', 'react', 'mermaid', 'chart', 'math', 'jupyter'];

export function ArtifactList({
  sessionId,
  className,
  maxHeight = '400px',
  onArtifactClick,
}: ArtifactListProps) {
  const t = useTranslations('artifactList');
  const tArtifacts = useTranslations('artifacts');
  const activeArtifactId = useArtifactStore((state) => state.activeArtifactId);
  const setActiveArtifact = useArtifactStore((state) => state.setActiveArtifact);
  const deleteArtifact = useArtifactStore((state) => state.deleteArtifact);
  const openPanel = useArtifactStore((state) => state.openPanel);
  const getSessionArtifacts = useArtifactStore((state) => state.getSessionArtifacts);
  const searchArtifacts = useArtifactStore((state) => state.searchArtifacts);
  const filterArtifactsByType = useArtifactStore((state) => state.filterArtifactsByType);
  const deleteArtifacts = useArtifactStore((state) => state.deleteArtifacts);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  const currentSessionId = sessionId || getActiveSession()?.id;

  const sessionArtifacts = useMemo(() => {
    if (!currentSessionId) return [];

    // Apply search if query exists
    if (searchQuery.trim()) {
      return searchArtifacts(searchQuery, currentSessionId)
        .sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      return filterArtifactsByType(typeFilter as ArtifactType, currentSessionId)
        .sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
    }

    return getSessionArtifacts(currentSessionId)
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [currentSessionId, getSessionArtifacts, searchArtifacts, filterArtifactsByType, searchQuery, typeFilter]);

  const handleArtifactClick = (artifact: Artifact) => {
    if (batchMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(artifact.id)) {
          next.delete(artifact.id);
        } else {
          next.add(artifact.id);
        }
        return next;
      });
      return;
    }
    setActiveArtifact(artifact.id);
    openPanel('artifact');
    onArtifactClick?.(artifact);
  };

  const handleDelete = (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteArtifact(artifactId);
  };

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      deleteArtifacts(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBatchMode(false);
    }
  }, [selectedIds, deleteArtifacts]);

  if (sessionArtifacts.length === 0 && !searchQuery && typeFilter === 'all') {
    return (
      <EmptyState
        icon={Code}
        title={t('noArtifacts')}
        description={t('noArtifactsDesc')}
        className={className}
        compact
      />
    );
  }

  return (
    <div className={className} style={{ maxHeight }}>
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2 p-2 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={tArtifacts('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tArtifacts('allTypes')}</SelectItem>
            {ARTIFACT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`types.${TYPE_LABEL_KEYS[type]}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={batchMode ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => {
            setBatchMode(!batchMode);
            setSelectedIds(new Set());
          }}
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Batch Actions */}
      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-destructive/10 border-b">
          <span className="text-xs text-destructive">
            {tArtifacts('batchDeleteConfirm', { count: selectedIds.size })}
          </span>
          <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={handleBatchDelete}>
            <Trash2 className="h-3 w-3 mr-1" />
            {tArtifacts('batchDelete')}
          </Button>
        </div>
      )}

      <ScrollArea style={{ maxHeight: `calc(${maxHeight} - 48px)` }}>
      <div className="space-y-1 p-2">
        {sessionArtifacts.map((artifact) => {
          const createdAt =
            artifact.createdAt instanceof Date ? artifact.createdAt : new Date(artifact.createdAt);

          return (
            <ContextMenu key={artifact.id}>
              <ContextMenuTrigger>
                <Button
                  variant={activeArtifactId === artifact.id ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-2 h-auto py-2 px-3',
                    activeArtifactId === artifact.id && 'bg-secondary'
                  )}
                  onClick={() => handleArtifactClick(artifact)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-muted-foreground shrink-0">
                      {getArtifactTypeIcon(artifact.type)}
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{artifact.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {t(`types.${TYPE_LABEL_KEYS[artifact.type]}`)}
                    </Badge>
                    {PREVIEWABLE_TYPES.includes(artifact.type) && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] px-1">
                        {ARTIFACT_TYPE_ICONS[artifact.type] ? '👁' : '▶'}
                      </Badge>
                    )}
                  </div>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleArtifactClick(artifact)}>
                  {t('open')}
                </ContextMenuItem>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ContextMenuItem
                        className="text-destructive"
                        onClick={(e) => handleDelete(artifact.id, e as unknown as React.MouseEvent)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete')}
                      </ContextMenuItem>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{t('delete')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </ScrollArea>
    </div>
  );
}

/**
 * Compact artifact list for sidebar
 */
export function ArtifactListCompact({
  sessionId,
  className,
  limit = 5,
}: {
  sessionId?: string;
  className?: string;
  limit?: number;
}) {
  const setActiveArtifact = useArtifactStore((state) => state.setActiveArtifact);
  const openPanel = useArtifactStore((state) => state.openPanel);
  const getRecentArtifacts = useArtifactStore((state) => state.getRecentArtifacts);
  const getSessionArtifacts = useArtifactStore((state) => state.getSessionArtifacts);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const currentSessionId = sessionId || getActiveSession()?.id;

  const sessionArtifacts = useMemo(() => {
    if (currentSessionId) {
      return getSessionArtifacts(currentSessionId)
        .sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, limit);
    }
    // Fallback to recent artifacts across all sessions
    return getRecentArtifacts(limit);
  }, [currentSessionId, limit, getSessionArtifacts, getRecentArtifacts]);

  if (sessionArtifacts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-1', className)}>
      {sessionArtifacts.map((artifact) => (
        <Button
          key={artifact.id}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8"
          onClick={() => {
            setActiveArtifact(artifact.id);
            openPanel('artifact');
          }}
        >
          <span className="text-muted-foreground">{getArtifactTypeIcon(artifact.type)}</span>
          <span className="truncate text-xs">{artifact.title}</span>
        </Button>
      ))}
    </div>
  );
}

export default ArtifactList;
