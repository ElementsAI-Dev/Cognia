'use client';

/**
 * SourcesDisplay - Display web search sources with the ai-elements Sources component
 */

import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/sources';
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
} from '@/components/ai-elements/inline-citation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Globe, ExternalLink, Clock } from 'lucide-react';

export interface WebSource {
  id: string;
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

interface SourcesDisplayProps {
  sources: WebSource[];
  className?: string;
}

/**
 * Display a list of web search sources in a collapsible panel
 */
export function SourcesDisplay({
  sources,
  className,
}: SourcesDisplayProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Sources className={className}>
      <SourcesTrigger count={sources.length}>
        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
          <Globe className="h-4 w-4" />
          <span className="font-medium">
            {sources.length} source{sources.length !== 1 ? 's' : ''} used
          </span>
        </div>
      </SourcesTrigger>
      <SourcesContent>
        {sources.map((source, index) => (
          <SourceItem key={source.id || index} source={source} index={index} />
        ))}
      </SourcesContent>
    </Sources>
  );
}

interface SourceItemProps {
  source: WebSource;
  index: number;
}

function SourceItem({ source, index }: SourceItemProps) {
  const hostname = getHostname(source.url);

  return (
    <Source href={source.url} title={source.title}>
      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
        <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{source.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{hostname}</p>
          {source.content && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {source.content}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {Math.round(source.score * 100)}% relevant
            </Badge>
            {source.publishedDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(source.publishedDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Source>
  );
}

interface InlineSourceCitationProps {
  text: string;
  sources: WebSource[];
  className?: string;
}

/**
 * Display inline citation with hover card showing source details
 */
export function InlineSourceCitation({
  text,
  sources,
  className,
}: InlineSourceCitationProps) {
  if (!sources || sources.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const sourceUrls = sources.map((s) => s.url);

  return (
    <InlineCitation className={className}>
      <InlineCitationText>{text}</InlineCitationText>
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={sourceUrls} />
        <InlineCitationCardBody>
          <InlineCitationCarousel>
            <InlineCitationCarouselHeader>
              <InlineCitationCarouselPrev />
              <InlineCitationCarouselIndex />
              <InlineCitationCarouselNext />
            </InlineCitationCarouselHeader>
            <InlineCitationCarouselContent>
              {sources.map((source, index) => (
                <InlineCitationCarouselItem key={source.id || index}>
                  <InlineCitationSource
                    title={source.title}
                    url={source.url}
                    description={source.content}
                  />
                </InlineCitationCarouselItem>
              ))}
            </InlineCitationCarouselContent>
          </InlineCitationCarousel>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  );
}

interface SourcesSummaryProps {
  sources: WebSource[];
  answer?: string;
  responseTime?: number;
  className?: string;
}

/**
 * Display a summary of search results with answer and sources
 */
export function SourcesSummary({
  sources,
  answer,
  responseTime,
  className,
}: SourcesSummaryProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Answer section */}
      {answer && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Web Search Answer</span>
            {responseTime && (
              <span className="text-xs text-muted-foreground ml-auto">
                {(responseTime / 1000).toFixed(2)}s
              </span>
            )}
          </div>
          <p className="text-sm">{answer}</p>
        </div>
      )}

      {/* Sources list */}
      <SourcesDisplay sources={sources} />
    </div>
  );
}

// Helper functions
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateString;
  }
}

export default SourcesDisplay;
