'use client';

/**
 * PromptMarketplaceCard - Card component for displaying a marketplace prompt
 */

import { useState } from 'react';
import {
  Star,
  Download,
  Heart,
  Check,
  ExternalLink,
  User,
  Badge as BadgeIcon,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MarketplacePrompt } from '@/types/prompt-marketplace';
import { QUALITY_TIER_INFO } from '@/types/prompt-marketplace';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';

interface PromptMarketplaceCardProps {
  prompt: MarketplacePrompt;
  onViewDetail?: (prompt: MarketplacePrompt) => void;
  onInstall?: (prompt: MarketplacePrompt) => void;
  compact?: boolean;
}

export function PromptMarketplaceCard({
  prompt,
  onViewDetail,
  onInstall,
  compact = false,
}: PromptMarketplaceCardProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  
  const isInstalled = usePromptMarketplaceStore(state => state.isPromptInstalled(prompt.id));
  const isFavorite = usePromptMarketplaceStore(state => state.isFavorite(prompt.id));
  const addToFavorites = usePromptMarketplaceStore(state => state.addToFavorites);
  const removeFromFavorites = usePromptMarketplaceStore(state => state.removeFromFavorites);
  const installPrompt = usePromptMarketplaceStore(state => state.installPrompt);
  const recordView = usePromptMarketplaceStore(state => state.recordView);

  const tierInfo = QUALITY_TIER_INFO[prompt.qualityTier];

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      if (onInstall) {
        onInstall(prompt);
      } else {
        await installPrompt(prompt);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleFavoriteToggle = () => {
    if (isFavorite) {
      removeFromFavorites(prompt.id);
    } else {
      addToFavorites(prompt.id);
    }
  };

  const handleViewDetail = () => {
    recordView(prompt.id);
    onViewDetail?.(prompt);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-md cursor-pointer',
        compact ? 'p-3' : 'p-4',
        isInstalled && 'ring-1 ring-primary/30 bg-primary/5'
      )}
      onClick={handleViewDetail}
    >
      {/* Quality Tier Badge */}
      {prompt.qualityTier !== 'community' && (
        <div className="absolute top-2 right-2 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
              >
                {tierInfo.icon} {tierInfo.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{tierInfo.description}</TooltipContent>
          </Tooltip>
        </div>
      )}

      <CardContent className={cn('p-0', compact ? 'space-y-2' : 'space-y-3')}>
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center rounded-lg text-lg shrink-0',
              compact ? 'w-10 h-10' : 'w-12 h-12'
            )}
            style={{ backgroundColor: `${prompt.color || '#6366f1'}20` }}
          >
            {prompt.icon || '📝'}
          </div>

          {/* Title & Author */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold truncate group-hover:text-primary transition-colors',
              compact ? 'text-sm' : 'text-base'
            )}>
              {prompt.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">{prompt.author.name}</span>
              {prompt.author.verified && (
                <BadgeIcon className="h-3 w-3 text-blue-500" />
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {!compact && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {prompt.description}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {prompt.tags.slice(0, compact ? 2 : 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs py-0">
              {tag}
            </Badge>
          ))}
          {prompt.tags.length > (compact ? 2 : 3) && (
            <Badge variant="outline" className="text-xs py-0">
              +{prompt.tags.length - (compact ? 2 : 3)}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
            <span>{prompt.rating.average.toFixed(1)}</span>
            <span className="text-muted-foreground/60">({prompt.rating.count})</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            <span>{formatNumber(prompt.stats.downloads)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className={cn('p-0 pt-3 flex items-center gap-2', compact && 'pt-2')}>
        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteToggle();
          }}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorite && 'text-red-500 fill-red-500'
            )}
          />
        </Button>

        {/* Install / Open Button */}
        {isInstalled ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail();
            }}
          >
            <Check className="h-3.5 w-3.5 text-green-500" />
            Installed
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 h-8 gap-1.5"
            disabled={isInstalling}
            onClick={(e) => {
              e.stopPropagation();
              handleInstall();
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {isInstalling ? 'Installing...' : 'Install'}
          </Button>
        )}

        {/* View Detail */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetail();
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PromptMarketplaceCard;
