'use client';

/**
 * ArtifactCard - Card component to display artifact reference in messages
 */

import { useTranslations } from 'next-intl';
import {
  Code,
  FileText,
  Image as ImageIcon,
  BarChart,
  GitBranch,
  Sparkles,
  Calculator,
  ExternalLink,
  Eye,
  BookOpen,
} from 'lucide-react';
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

interface ArtifactCardProps {
  artifact: Artifact;
  className?: string;
  compact?: boolean;
  showPreview?: boolean;
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
  jupyter: <BookOpen className="h-4 w-4" />,
};

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

const typeColors: Record<ArtifactType, string> = {
  code: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  document: 'bg-green-500/10 text-green-600 dark:text-green-400',
  svg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  html: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  react: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  mermaid: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  chart: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  math: 'bg-red-500/10 text-red-600 dark:text-red-400',
  jupyter: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

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
              {typeIcons[artifact.type]}
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
            {typeIcons[artifact.type]}
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
      {typeIcons[artifact.type]}
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
