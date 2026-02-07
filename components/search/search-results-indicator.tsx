'use client';

/**
 * Search Results Indicator
 * Shows a compact inline indicator of web search results in chat messages
 */

import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, ExternalLink, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import type { SearchResponse, SearchResult } from '@/types/search';

export interface SearchResultsIndicatorProps {
  searchResponse: SearchResponse;
  className?: string;
  defaultExpanded?: boolean;
}

export function SearchResultsIndicator({
  searchResponse,
  className,
  defaultExpanded = false,
}: SearchResultsIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!searchResponse.results || searchResponse.results.length === 0) {
    return null;
  }

  const { results, provider, responseTime, answer } = searchResponse;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          'rounded-lg border bg-muted/30 text-sm',
          className
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-2 px-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">
                {results.length} sources found
              </span>
              {provider && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {provider}
                </Badge>
              )}
              {responseTime && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {responseTime}ms
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-2 space-y-1.5">
            {answer && (
              <div className="text-xs text-muted-foreground bg-background/50 rounded p-2 mb-2">
                <span className="font-medium text-foreground">Quick Answer: </span>
                {answer.length > 200 ? `${answer.slice(0, 200)}...` : answer}
              </div>
            )}

            {results.slice(0, 5).map((result: SearchResult, index: number) => (
              <SearchResultItem key={`${result.url}-${index}`} result={result} />
            ))}

            {results.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                +{results.length - 5} more sources
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SearchResultItem({ result }: { result: SearchResult }) {
  let domain = '';
  try {
    domain = new URL(result.url).hostname.replace('www.', '');
  } catch {
    domain = result.url;
  }

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-start gap-2 p-1.5 rounded-md',
        'hover:bg-muted/50 transition-colors group'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate text-foreground group-hover:text-primary">
            {result.title || domain}
          </span>
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {domain}
        </p>
      </div>
      {result.score !== undefined && result.score > 0.7 && (
        <Shield className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
      )}
    </a>
  );
}
