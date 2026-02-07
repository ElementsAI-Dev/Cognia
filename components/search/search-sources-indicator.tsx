'use client';

/**
 * Search Sources Indicator
 * Compact inline display of web search sources attached to chat messages
 */

import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Source } from '@/types/core/message';

export interface SearchSourcesIndicatorProps {
  sources: Source[];
  className?: string;
}

export function SearchSourcesIndicator({
  sources,
  className,
}: SearchSourcesIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn('rounded-lg border bg-muted/30 text-sm', className)}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-1.5 px-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium">
                {sources.length} web source{sources.length !== 1 ? 's' : ''}
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-2 space-y-1">
            {sources.map((source) => (
              <SourceItem key={source.id} source={source} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SourceItem({ source }: { source: Source }) {
  let domain = '';
  try {
    domain = new URL(source.url).hostname.replace('www.', '');
  } catch {
    domain = source.url;
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-start gap-2 p-1.5 rounded-md',
        'hover:bg-muted/50 transition-colors group'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium truncate text-foreground group-hover:text-primary">
            {source.title || domain}
          </span>
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{domain}</p>
      </div>
    </a>
  );
}
