'use client';

/**
 * SourcesDisplay - Display web search sources with the ai-elements Sources component
 * Supports verification badges when source verification is enabled
 */

import { useTranslations } from 'next-intl';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { 
  Globe, 
  ExternalLink, 
  Clock,
} from 'lucide-react';
import type { CredibilityLevel, SourceVerification } from '@/types/search';
import { credibilityConfig } from './credibility-utils';

export interface WebSource {
  id: string;
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
  verification?: SourceVerification;
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
  const t = useTranslations('sources');
  // Get verification badge setting from store
  const showVerificationBadges = useSettingsStore(
    (state) => state.sourceVerificationSettings.showVerificationBadges
  );

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Sources className={className}>
      <SourcesTrigger count={sources.length}>
        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
          <Globe className="h-4 w-4" />
          <span className="font-medium">
            {t('sourcesUsed', { count: sources.length })}
          </span>
        </div>
      </SourcesTrigger>
      <SourcesContent>
        {sources.map((source, index) => (
          <SourceItem 
            key={source.id || index} 
            source={source} 
            index={index}
            showVerificationBadges={showVerificationBadges}
          />
        ))}
      </SourcesContent>
    </Sources>
  );
}

interface SourceItemProps {
  source: WebSource;
  index: number;
  showVerificationBadges?: boolean;
}

function SourceItem({ source, index, showVerificationBadges = false }: SourceItemProps) {
  const t = useTranslations('sources');
  const hostname = getHostname(source.url);
  const verification = source.verification;
  const credibility = verification?.credibilityLevel || 'unknown';
  const iconConfig = credibilityConfig[credibility];

  return (
    <Source href={source.url} title={source.title}>
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {index + 1}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{source.title}</span>
                {showVerificationBadges && verification && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border', iconConfig.badgeClassName)}>
                          {iconConfig.icon}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t(`credibility.${credibility}`)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('credibilityScore', { score: Math.round(verification.credibilityScore * 100) })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground truncate">{hostname}</p>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{source.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{hostname}</p>
            {source.content && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {source.content}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {t('relevanceScore', { score: Math.round(source.score * 100) })}
              </Badge>
              {showVerificationBadges && verification?.sourceType && verification.sourceType !== 'unknown' && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {verification.sourceType}
                </Badge>
              )}
              {source.publishedDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(source.publishedDate)}
                </span>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
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
  const t = useTranslations('sources');
  return (
    <div className={cn('space-y-4', className)}>
      {/* Answer section */}
      {answer && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{t('webSearchAnswer')}</span>
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

// Note: formatDate returns relative time strings - these should be handled by
// the component using useTranslations for proper i18n support
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Return structured data that can be translated by component
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
    return `${Math.floor(diffDays / 365)}y`;
  } catch {
    return dateString;
  }
}

export default SourcesDisplay;
