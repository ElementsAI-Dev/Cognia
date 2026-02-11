'use client';

import { useTranslations } from 'next-intl';
import {
  RefreshCw,
  Sparkles,
  TrendingUp,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';
import { PromptMarketplaceCard } from '../prompt-marketplace-card';

interface BrowseTabProps {
  featuredPrompts: MarketplacePrompt[];
  trendingPrompts: MarketplacePrompt[];
  displayPrompts: MarketplacePrompt[];
  paginatedPrompts: MarketplacePrompt[];
  hasActiveFilters: boolean;
  hasMorePrompts: boolean;
  isLoading: boolean;
  gridClasses: string;
  viewMode: 'grid' | 'list';
  onViewDetail: (prompt: MarketplacePrompt) => void;
  onInstall?: (prompt: MarketplacePrompt) => void;
  onLoadMore: () => void;
  onClearFilters: () => void;
}

export function BrowseTab({
  featuredPrompts,
  trendingPrompts,
  displayPrompts,
  paginatedPrompts,
  hasActiveFilters,
  hasMorePrompts,
  isLoading,
  gridClasses,
  viewMode,
  onViewDetail,
  onInstall,
  onLoadMore,
  onClearFilters,
}: BrowseTabProps) {
  const t = useTranslations('promptMarketplace');

  return (
    <>
      {/* Featured Section (only when no filters) */}
      {!hasActiveFilters && featuredPrompts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 text-yellow-600 dark:text-yellow-500 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg tracking-tight">
                  {t('sections.featured')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('sections.featuredDesc')}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {featuredPrompts.length} {t('common.prompts')}
            </Badge>
          </div>
          <div className={gridClasses}>
            {featuredPrompts.map((prompt, index) => (
              <PromptMarketplaceCard
                key={prompt.id}
                prompt={prompt}
                onViewDetail={onViewDetail}
                onInstall={onInstall}
                compact={viewMode === 'list'}
                featured={index === 0 && viewMode === 'grid'}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Section (only when no filters) */}
      {!hasActiveFilters && trendingPrompts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-600 dark:text-orange-500 shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg tracking-tight">
                  {t('sections.trending')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('sections.trendingDesc')}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {t('common.thisWeek')}
            </Badge>
          </div>
          <div className={gridClasses}>
            {trendingPrompts.slice(0, 8).map((prompt) => (
              <PromptMarketplaceCard
                key={prompt.id}
                prompt={prompt}
                onViewDetail={onViewDetail}
                onInstall={onInstall}
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        </section>
      )}

      {/* All/Filtered Prompts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-500 shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg tracking-tight">
                {hasActiveFilters ? t('search.results') : t('sections.allPrompts')}
              </h3>
              {hasActiveFilters && (
                <p className="text-xs text-muted-foreground">
                  {t('search.matchingFilters')}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="ml-2 font-mono text-xs tabular-nums">
              {displayPrompts.length}
            </Badge>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('filters.clearFilters')}</span>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className={gridClasses}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[200px] rounded-xl" />
                <div className="space-y-2 px-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayPrompts.length > 0 ? (
          <div className="space-y-6">
            <div className={gridClasses}>
              {paginatedPrompts.map((prompt) => (
                <PromptMarketplaceCard
                  key={prompt.id}
                  prompt={prompt}
                  onViewDetail={onViewDetail}
                  onInstall={onInstall}
                  compact={viewMode === 'list'}
                />
              ))}
            </div>
            {hasMorePrompts && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  className="gap-2"
                >
                  {t('pagination.loadMore')}
                  <Badge variant="secondary" className="ml-1">
                    {displayPrompts.length - paginatedPrompts.length}
                  </Badge>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Empty className="py-10 sm:py-14 border-2 rounded-2xl bg-muted/20">
            <EmptyMedia variant="icon" className="bg-muted/50">
              <Package className="h-10 w-10 text-muted-foreground/40" />
            </EmptyMedia>
            <EmptyTitle>{t('search.noResults')}</EmptyTitle>
            <EmptyDescription>{t('search.noResultsDesc')}</EmptyDescription>
            {hasActiveFilters && (
              <EmptyContent>
                <Button variant="outline" className="gap-2" onClick={onClearFilters}>
                  <RefreshCw className="h-4 w-4" />
                  {t('search.clearFilters')}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}
      </section>
    </>
  );
}
