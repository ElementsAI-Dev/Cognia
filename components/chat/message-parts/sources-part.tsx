'use client';

/**
 * SourcesPart - Renders search result sources
 */

import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/sources';
import type { SourcesPart as SourcesPartType } from '@/types/message';

interface SourcesPartProps {
  part: SourcesPartType;
}

export function SourcesPart({ part }: SourcesPartProps) {
  if (!part.sources || part.sources.length === 0) {
    return null;
  }

  return (
    <Sources>
      <SourcesTrigger count={part.sources.length} />
      <SourcesContent>
        {part.sources.map((source) => (
          <Source key={source.id} href={source.url} title={source.title}>
            <div className="flex flex-col">
              <span className="font-medium text-primary">{source.title}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {source.snippet}
              </span>
            </div>
          </Source>
        ))}
      </SourcesContent>
    </Sources>
  );
}
