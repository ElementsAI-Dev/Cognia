'use client';

/**
 * Marketplace Card Component
 * Displays a single MCP marketplace item
 */

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Star,
  Download,
  Key,
  Check,
  Loader2,
  Shield,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { McpMarketplaceItem } from '@/types/mcp/mcp-marketplace';
import { formatDownloadCount, formatStarCount } from '@/lib/mcp/marketplace';
import { getSourceColor, highlightSearchQuery, type HighlightSegment } from '@/lib/mcp/marketplace-utils';

interface MarketplaceCardProps {
  item: McpMarketplaceItem;
  isInstalled: boolean;
  installStatus: string;
  searchQuery: string;
  isFocused: boolean;
  onSelect: () => void;
  onInstall: () => void;
}

/** Render highlighted text */
function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
  return (
    <>
      {segments.map((segment, i) =>
        segment.isHighlight ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  );
}

export const MarketplaceCard = memo(function MarketplaceCard({
  item,
  isInstalled,
  installStatus,
  searchQuery,
  isFocused,
  onSelect,
  onInstall,
}: MarketplaceCardProps) {
  const t = useTranslations('mcpMarketplace');

  const isInstalling = installStatus === 'installing';

  // Memoize highlighted segments
  const nameSegments = useMemo(
    () => highlightSearchQuery(item.name, searchQuery),
    [item.name, searchQuery]
  );
  const descSegments = useMemo(
    () => highlightSearchQuery(item.description, searchQuery),
    [item.description, searchQuery]
  );

  return (
    <Card 
      className={`flex flex-col hover:shadow-md transition-shadow cursor-pointer ${isFocused ? 'ring-2 ring-primary' : ''}`}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0 flex-1">
            <CardTitle className="text-sm font-medium truncate flex items-center gap-1.5">
              <HighlightedText segments={nameSegments} />
              {item.verified && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Shield className="h-3 w-3 text-blue-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>{t('verified')}</TooltipContent>
                </Tooltip>
              )}
              {item.remote && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Cloud className="h-3 w-3 text-green-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>{t('remoteHosting')}</TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <CardDescription className="text-xs truncate">
              {t('byAuthor', { author: item.author })}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {item.source && (
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getSourceColor(item.source)}`}>
                {item.source}
              </Badge>
            )}
            {isInstalled && (
              <Badge variant="secondary" className="text-[10px]">
                <Check className="h-3 w-3 mr-1" />
                {t('installed')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2 flex-1">
        <p className="text-xs text-muted-foreground line-clamp-2">
          <HighlightedText segments={descSegments} />
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{item.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help">
                  <Star className="h-3 w-3" />
                  {formatStarCount(item.githubStars)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('githubStars')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help">
                  <Download className="h-3 w-3" />
                  {formatDownloadCount(item.downloadCount)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('downloads')}</TooltipContent>
            </Tooltip>
            {item.requiresApiKey && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <Key className="h-3 w-3 text-yellow-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('requiresApiKey')}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <Button
            size="sm"
            variant={isInstalled ? 'outline' : 'default'}
            className="h-7 text-xs"
            disabled={isInstalled || isInstalling}
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
          >
            {isInstalling ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {t('installing')}
              </>
            ) : isInstalled ? (
              t('installed')
            ) : (
              t('install')
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});
