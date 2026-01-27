'use client';

/**
 * ArtifactList - Displays a list of artifacts for the current session
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useArtifactStore, useSessionStore } from '@/stores';
import type { Artifact } from '@/types';
import { ARTIFACT_TYPE_KEYS } from '@/lib/artifacts';
import { getArtifactTypeIcon } from './artifact-icons';

interface ArtifactListProps {
  sessionId?: string;
  className?: string;
  maxHeight?: string;
  onArtifactClick?: (artifact: Artifact) => void;
}

// Use centralized type label keys
const TYPE_LABEL_KEYS = ARTIFACT_TYPE_KEYS;

export function ArtifactList({
  sessionId,
  className,
  maxHeight = '400px',
  onArtifactClick,
}: ArtifactListProps) {
  const t = useTranslations('artifactList');
  const artifacts = useArtifactStore((state) => state.artifacts);
  const activeArtifactId = useArtifactStore((state) => state.activeArtifactId);
  const setActiveArtifact = useArtifactStore((state) => state.setActiveArtifact);
  const deleteArtifact = useArtifactStore((state) => state.deleteArtifact);
  const openPanel = useArtifactStore((state) => state.openPanel);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const currentSessionId = sessionId || getActiveSession()?.id;

  const sessionArtifacts = useMemo(() => {
    if (!currentSessionId) return [];
    
    return Object.values(artifacts)
      .filter((a) => a.sessionId === currentSessionId)
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [artifacts, currentSessionId]);

  const handleArtifactClick = (artifact: Artifact) => {
    setActiveArtifact(artifact.id);
    openPanel('artifact');
    onArtifactClick?.(artifact);
  };

  const handleDelete = (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteArtifact(artifactId);
  };

  if (sessionArtifacts.length === 0) {
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
    <ScrollArea className={className} style={{ maxHeight }}>
      <div className="space-y-1 p-2">
        {sessionArtifacts.map((artifact) => {
          const createdAt = artifact.createdAt instanceof Date 
            ? artifact.createdAt 
            : new Date(artifact.createdAt);
          
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
                      <p className="text-sm font-medium truncate">
                        {artifact.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {t(`types.${TYPE_LABEL_KEYS[artifact.type]}`)}
                    </Badge>
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
  const artifacts = useArtifactStore((state) => state.artifacts);
  const setActiveArtifact = useArtifactStore((state) => state.setActiveArtifact);
  const openPanel = useArtifactStore((state) => state.openPanel);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const currentSessionId = sessionId || getActiveSession()?.id;

  const sessionArtifacts = useMemo(() => {
    if (!currentSessionId) return [];
    
    return Object.values(artifacts)
      .filter((a) => a.sessionId === currentSessionId)
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }, [artifacts, currentSessionId, limit]);

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
          <span className="text-muted-foreground">
            {getArtifactTypeIcon(artifact.type)}
          </span>
          <span className="truncate text-xs">{artifact.title}</span>
        </Button>
      ))}
    </div>
  );
}

export default ArtifactList;
