'use client';

/**
 * ArtifactCard - Card component to display artifact reference in messages
 */

import { useTranslations } from 'next-intl';
import { ExternalLink, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useArtifactStore } from '@/stores';
import type { Artifact, ArtifactType } from '@/types';
import { ARTIFACT_COLORS } from '@/lib/artifacts';
import { getArtifactTypeIcon } from './artifact-icons';

interface ArtifactCardProps {
  artifact: Artifact;
  className?: string;
  compact?: boolean;
  showPreview?: boolean;
}

// i18n keys for artifact type labels
const typeLabelKeys: Record<ArtifactType, string> = {
  code: 'typeCode',
  document: 'typeDocument',
  svg: 'typeSvg',
  html: 'typeHtml',
  react: 'typeReact',
  mermaid: 'typeMermaid',
  chart: 'typeChart',
  math: 'typeMath',
  jupyter: 'typeJupyter',
};

// Use centralized colors
const typeColors = ARTIFACT_COLORS;

export function ArtifactCard({
  artifact,
  className,
  compact = false,
  showPreview = false,
}: ArtifactCardProps) {
  const t = useTranslations('artifacts');
  const setActiveArtifact = useArtifactStore((state) => state.setActiveArtifact);
  const openPanel = useArtifactStore((state) => state.openPanel);

  const handleOpen = () => {
    setActiveArtifact(artifact.id);
    openPanel('artifact');
  };

  // Get a preview snippet of the content
  const previewSnippet = artifact.content.slice(0, 100).trim() + 
    (artifact.content.length > 100 ? '...' : '');

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'gap-2 h-7 text-xs',
                typeColors[artifact.type],
                className
              )}
              onClick={handleOpen}
            >
              {getArtifactTypeIcon(artifact.type)}
              <span className="max-w-[120px] truncate">{artifact.title}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{artifact.title}</p>
            <p className="text-xs text-muted-foreground">
              {t(typeLabelKeys[artifact.type])} · v{artifact.version}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer transition-colors hover:bg-muted/50',
        className
      )}
      onClick={handleOpen}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'shrink-0 p-2 rounded-lg',
            typeColors[artifact.type]
          )}>
            {getArtifactTypeIcon(artifact.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{artifact.title}</h4>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {t(typeLabelKeys[artifact.type])}
              </Badge>
            </div>

            {showPreview && (
              <pre className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 overflow-hidden">
                {previewSnippet}
              </pre>
            )}

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>v{artifact.version}</span>
              {artifact.language && (
                <>
                  <span>·</span>
                  <span>{artifact.language}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleOpen();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inline artifact reference - minimal inline display
 */
export function ArtifactInlineRef({
  artifact,
  className,
}: {
  artifact: Artifact;
  className?: string;
}) {
  const setActiveArtifact = useArtifactStore((state) => state.setActiveArtifact);
  const openPanel = useArtifactStore((state) => state.openPanel);

  return (
    <button
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs',
        'bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
        className
      )}
      onClick={() => {
        setActiveArtifact(artifact.id);
        openPanel('artifact');
      }}
    >
      {getArtifactTypeIcon(artifact.type)}
      <span className="font-medium">{artifact.title}</span>
      <ExternalLink className="h-3 w-3 opacity-50" />
    </button>
  );
}

/**
 * Get artifacts for a message
 */
export function MessageArtifacts({
  messageId,
  className,
  compact = true,
}: {
  messageId: string;
  className?: string;
  compact?: boolean;
}) {
  const artifacts = useArtifactStore((state) => state.artifacts);

  const messageArtifacts = Object.values(artifacts).filter(
    (a) => a.messageId === messageId
  );

  if (messageArtifacts.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-1 mt-2', className)}>
        {messageArtifacts.map((artifact) => (
          <ArtifactCard
            key={artifact.id}
            artifact={artifact}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 mt-3', className)}>
      {messageArtifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          showPreview
        />
      ))}
    </div>
  );
}

export default ArtifactCard;
