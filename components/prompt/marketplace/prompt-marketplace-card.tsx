'use client';

/**
 * PromptMarketplaceCard - Card component for displaying a marketplace prompt
 * Modern design with glassmorphism, smooth animations, and responsive layout
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Star,
  Download,
  Heart,
  Check,
  User,
  Badge as BadgeIcon,
  Sparkles,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';
import { QUALITY_TIER_INFO } from '@/types/content/prompt-marketplace';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';

interface PromptMarketplaceCardProps {
  prompt: MarketplacePrompt;
  onViewDetail?: (prompt: MarketplacePrompt) => void;
  onInstall?: (prompt: MarketplacePrompt) => void;
  compact?: boolean;
  featured?: boolean;
}

export function PromptMarketplaceCard({
  prompt,
  onViewDetail,
  onInstall,
  compact = false,
  featured = false,
}: PromptMarketplaceCardProps) {
  const t = useTranslations('promptMarketplace.card');
  const [isInstalling, setIsInstalling] = useState(false);

  const isInstalled = usePromptMarketplaceStore((state) => state.isPromptInstalled(prompt.id));
  const isFavorite = usePromptMarketplaceStore((state) => state.isFavorite(prompt.id));
  const addToFavorites = usePromptMarketplaceStore((state) => state.addToFavorites);
  const removeFromFavorites = usePromptMarketplaceStore((state) => state.removeFromFavorites);
  const installPrompt = usePromptMarketplaceStore((state) => state.installPrompt);
  const recordView = usePromptMarketplaceStore((state) => state.recordView);

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

  // List view (compact)
  if (compact) {
    return (
      <Card
        className={cn(
          'group relative overflow-hidden transition-all duration-300 cursor-pointer',
          'border-border/50 bg-card/60 backdrop-blur-sm',
          'hover:bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
          isInstalled && 'ring-1 ring-primary/40 bg-primary/5'
        )}
        onClick={handleViewDetail}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Icon */}
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl text-xl shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md"
            style={{
              backgroundColor: `${prompt.color || '#6366f1'}15`,
              color: prompt.color || '#6366f1',
            }}
          >
            {prompt.icon || '📝'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {prompt.name}
              </h3>
              {prompt.qualityTier !== 'community' && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 font-medium border-0 shrink-0"
                  style={{
                    backgroundColor: `${tierInfo.color}15`,
                    color: tierInfo.color,
                  }}
                >
                  {tierInfo.icon}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{prompt.description}</p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-medium">{prompt.rating.average.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              <span>{formatNumber(prompt.stats.downloads)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 transition-colors',
                isFavorite && 'text-red-500'
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleFavoriteToggle();
              }}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </Button>
            {isInstalled ? (
              <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-0">
                <Check className="h-3 w-3" />
                {t('installed')}
              </Badge>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 h-8"
                disabled={isInstalling}
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstall();
                }}
              >
                {isInstalling ? (
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {isInstalling ? t('installing') : t('install')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 cursor-pointer',
        'border-border/50 bg-card/60 backdrop-blur-sm',
        'hover:bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5',
        'hover:-translate-y-1',
        featured && 'md:col-span-2 lg:row-span-2',
        isInstalled && 'ring-1 ring-primary/40 bg-primary/5'
      )}
      onClick={handleViewDetail}
    >
      {/* Gradient Overlays */}
      {prompt.qualityTier === 'official' && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      {prompt.qualityTier === 'premium' && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-fuchsia-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}

      {/* Corner Accent */}
      <div 
        className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ backgroundColor: prompt.color || '#6366f1' }}
      />

      {/* Quality Tier Badge */}
      {prompt.qualityTier !== 'community' && (
        <div className="absolute top-4 right-4 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 h-5 font-medium border-0 backdrop-blur-md shadow-sm"
                style={{
                  backgroundColor: `${tierInfo.color}20`,
                  color: tierInfo.color,
                  boxShadow: `0 0 0 1px ${tierInfo.color}30`,
                }}
              >
                {tierInfo.icon} <span className="ml-1">{tierInfo.name}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{tierInfo.description}</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* View Detail Arrow */}
      <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
        <div className="p-1.5 rounded-full bg-primary/10 text-primary">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>

      <CardContent className={cn('p-5 space-y-4 relative z-0', featured && 'p-6')}>
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center rounded-2xl text-2xl shrink-0 shadow-sm transition-all duration-300',
              'group-hover:scale-110 group-hover:shadow-lg group-hover:rotate-3',
              featured ? 'w-16 h-16 text-3xl' : 'w-14 h-14'
            )}
            style={{
              backgroundColor: `${prompt.color || '#6366f1'}15`,
              color: prompt.color || '#6366f1',
            }}
          >
            {prompt.icon || '📝'}
          </div>

          {/* Title & Author */}
          <div className="flex-1 min-w-0 py-0.5">
            <h3
              className={cn(
                'font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2',
                featured ? 'text-lg' : 'text-base'
              )}
            >
              {prompt.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate group-hover:text-foreground transition-colors">
                {prompt.author.name}
              </span>
              {prompt.author.verified && (
                <Tooltip>
                  <TooltipTrigger>
                    <BadgeIcon className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />
                  </TooltipTrigger>
                  <TooltipContent>Verified Creator</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className={cn(
          'text-sm text-muted-foreground leading-relaxed',
          featured ? 'line-clamp-3' : 'line-clamp-2 min-h-10'
        )}>
          {prompt.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.slice(0, featured ? 5 : 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary/60 text-secondary-foreground border border-transparent group-hover:border-border/50 transition-all"
            >
              {tag}
            </span>
          ))}
          {prompt.tags.length > (featured ? 5 : 3) && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground bg-muted/50">
              +{prompt.tags.length - (featured ? 5 : 3)}
            </span>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs font-semibold">{prompt.rating.average.toFixed(1)}</span>
            <span className="text-[10px] opacity-70">({prompt.rating.count})</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5" />
            <span className="font-medium">{formatNumber(prompt.stats.downloads)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <span>{formatNumber(prompt.stats.views)}</span>
          </div>
          {prompt.stats.successRate && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500 ml-auto">
              <Sparkles className="h-3 w-3" />
              <span className="font-medium">{Math.round(prompt.stats.successRate * 100)}%</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-[auto_1fr] gap-2 p-4 pt-0">
        {/* Favorite Button */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-9 w-9 shrink-0 transition-all duration-300',
            'border-dashed hover:border-solid hover:bg-red-500/5 hover:text-red-500 hover:border-red-200',
            isFavorite &&
              'border-solid border-red-200 bg-red-50 text-red-500 dark:bg-red-950/30 dark:border-red-900'
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteToggle();
          }}
        >
          <Heart className={cn('h-4 w-4 transition-all duration-300', isFavorite && 'fill-current scale-110')} />
        </Button>

        {/* Action Button */}
        {isInstalled ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2 font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400 border-0"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail();
            }}
          >
            <Check className="h-4 w-4" />
            {t('installed')}
          </Button>
        ) : (
          <Button
            size="sm"
            className={cn(
              'w-full gap-2 font-medium shadow-sm transition-all duration-300',
              'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
              prompt.qualityTier === 'official'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0'
                : prompt.qualityTier === 'premium'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0'
                : ''
            )}
            disabled={isInstalling}
            onClick={(e) => {
              e.stopPropagation();
              handleInstall();
            }}
          >
            {isInstalling ? (
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isInstalling ? t('installing') : t('install')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default PromptMarketplaceCard;
