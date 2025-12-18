'use client';

/**
 * ArtifactList - Displays a list of artifacts for the current session
 */

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Code,
  FileText,
  Image as ImageIcon,
  BarChart,
  GitBranch,
  Sparkles,
  Calculator,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useArtifactStore, useSessionStore } from '@/stores';
import type { Artifact, ArtifactType } from '@/types';

interface ArtifactListProps {
  sessionId?: string;
  className?: string;
  maxHeight?: string;
  onArtifactClick?: (artifact: Artifact) => void;
}

const typeIcons: Record<ArtifactType, React.ReactNode> = {
  code: <Code className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  svg: <ImageIcon className="h-4 w-4" />,
  html: <Code className="h-4 w-4" />,
  react: <Sparkles className="h-4 w-4" />,
  mermaid: <GitBranch className="h-4 w-4" />,
  chart: <BarChart className="h-4 w-4" />,
  math: <Calculator className="h-4 w-4" />,
};

const typeLabels: Record<ArtifactType, string> = {
  code: 'Code',
  document: 'Document',
  svg: 'SVG',
  html: 'HTML',
  react: 'React',
  mermaid: 'Diagram',
  chart: 'Chart',
  math: 'Math',
};

export function ArtifactList({
  sessionId,
  className,
  maxHeight = '400px',
  onArtifactClick,
}: ArtifactListProps) {
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
      <div className={cn('flex flex-col items-center justify-center p-6 text-muted-foreground', className)}>
        <Code className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No artifacts yet</p>
        <p className="text-xs mt-1">Code snippets and content will appear here</p>
      </div>
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
                      {typeIcons[artifact.type]}
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
                      {typeLabels[artifact.type]}
                    </Badge>
                  </div>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleArtifactClick(artifact)}>
                  Open
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-destructive"
                  onClick={(e) => handleDelete(artifact.id, e as unknown as React.MouseEvent)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </ContextMenuItem>
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
            {typeIcons[artifact.type]}
          </span>
          <span className="truncate text-xs">{artifact.title}</span>
        </Button>
      ))}
    </div>
  );
}

export default ArtifactList;
