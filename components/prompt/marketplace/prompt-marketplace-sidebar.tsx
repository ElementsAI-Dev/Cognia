'use client';

/**
 * PromptMarketplaceSidebar - Filter sidebar with modern styling and responsive design
 */

import { useTranslations } from 'next-intl';
import { Star, SlidersHorizontal, ChevronRight, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  MARKETPLACE_CATEGORIES,
  QUALITY_TIER_INFO,
  type MarketplaceCategory,
} from '@/types/content/prompt-marketplace';

interface PromptMarketplaceSidebarProps {
  selectedCategory: MarketplaceCategory | 'all';
  onSelectCategory: (category: MarketplaceCategory | 'all') => void;
  selectedTiers: string[];
  onToggleTier: (tier: string) => void;
  minRating: number;
  onMinRatingChange: (value: number) => void;
  categoryCounts?: Record<string, number>;
  className?: string;
  onClose?: () => void;
  isMobile?: boolean;
}

export function PromptMarketplaceSidebar({
  selectedCategory,
  onSelectCategory,
  selectedTiers,
  onToggleTier,
  minRating,
  onMinRatingChange,
  categoryCounts,
  className,
  onClose,
  isMobile = false,
}: PromptMarketplaceSidebarProps) {
  const t = useTranslations('promptMarketplace');

  const hasActiveFilters = selectedCategory !== 'all' || selectedTiers.length > 0 || minRating > 0;

  const clearAllFilters = () => {
    onSelectCategory('all');
    selectedTiers.forEach((tier) => onToggleTier(tier));
    onMinRatingChange(0);
  };

  return (
    <div
      className={cn(
        'hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r bg-background/50 backdrop-blur-sm',
        isMobile && 'flex w-full',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <h2 className="font-semibold">{t('filters.title')}</h2>
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {t('filters.clearAll')}
            </Button>
          )}
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Categories Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('category.title')}
              </Label>
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  1
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              {/* All Category */}
              <Button
                variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'w-full justify-start font-normal h-9 transition-all',
                  selectedCategory === 'all' &&
                    'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20'
                )}
                onClick={() => onSelectCategory('all')}
              >
                <span className="mr-2.5 text-base">🌐</span>
                <span className="flex-1 text-left">{t('category.all')}</span>
                {categoryCounts?.['all'] !== undefined && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {categoryCounts['all']}
                  </span>
                )}
                {selectedCategory === 'all' && (
                  <ChevronRight className="h-3.5 w-3.5 ml-1 text-primary" />
                )}
              </Button>

              {/* Category List with Grouping */}
              <div className="pt-1 space-y-0.5">
                {MARKETPLACE_CATEGORIES.filter((c) => !['featured', 'trending', 'new'].includes(c.id)).map(
                  (category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'w-full justify-start font-normal h-9 transition-all',
                        selectedCategory === category.id &&
                          'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20'
                      )}
                      onClick={() => onSelectCategory(category.id)}
                    >
                      <span className="mr-2.5 text-base opacity-90">{category.icon}</span>
                      <span className="flex-1 text-left truncate">{category.name}</span>
                      {categoryCounts?.[category.id] !== undefined && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {categoryCounts[category.id]}
                        </span>
                      )}
                      {selectedCategory === category.id && (
                        <ChevronRight className="h-3.5 w-3.5 ml-1 text-primary" />
                      )}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Quality Tier Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('filters.qualityTier')}
              </Label>
              {selectedTiers.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {selectedTiers.length}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {Object.entries(QUALITY_TIER_INFO).map(([tier, info]) => (
                <label
                  key={tier}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all',
                    'hover:bg-muted/50',
                    selectedTiers.includes(tier) && 'bg-muted/70 ring-1 ring-border'
                  )}
                >
                  <Checkbox
                    id={`sidebar-tier-${tier}`}
                    checked={selectedTiers.includes(tier)}
                    onCheckedChange={() => onToggleTier(tier)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <span
                      className="w-6 h-6 flex items-center justify-center rounded-md text-sm"
                      style={{ backgroundColor: `${info.color}15`, color: info.color }}
                    >
                      {info.icon}
                    </span>
                    <span className="text-sm font-medium">{info.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Rating Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('filters.minRating')}
              </Label>
              {minRating > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                  <Star className="h-2.5 w-2.5 fill-current text-yellow-500" />
                  {minRating}+
                </Badge>
              )}
            </div>

            <div className="space-y-4 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4 transition-colors',
                        star <= minRating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {minRating > 0 ? `${minRating.toFixed(1)}+` : t('filters.anyRating')}
                </span>
              </div>

              <Slider
                value={[minRating]}
                onValueChange={([v]) => onMinRatingChange(v)}
                min={0}
                max={5}
                step={0.5}
                className="py-1"
              />

              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t('filters.anyRating')}</span>
                <span>5 {t('filters.stars')}</span>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <Separator className="bg-border/50" />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('filters.quickFilters')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {['featured', 'trending', 'new'].map((quickFilter) => {
                const category = MARKETPLACE_CATEGORIES.find((c) => c.id === quickFilter);
                if (!category) return null;
                return (
                  <Button
                    key={quickFilter}
                    variant={selectedCategory === quickFilter ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-8 gap-1.5 transition-all',
                      selectedCategory === quickFilter && 'shadow-sm'
                    )}
                    onClick={() =>
                      onSelectCategory(
                        selectedCategory === quickFilter ? 'all' : (quickFilter as MarketplaceCategory)
                      )
                    }
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('filters.activeFilters')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearAllFilters}
            >
              {t('filters.clearAll')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
