'use client';

/**
 * MarketplaceEmptyState - Empty state for marketplace search results
 * Uses @ui/empty component for consistent empty state styling
 */

import React from 'react';
import { Search, RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';

interface EmptyStateProps {
  searchQuery: string;
  onClear: () => void;
  onSearch?: (term: string) => void;
  onRefresh?: () => void;
}

export function MarketplaceEmptyState({ searchQuery, onClear, onSearch, onRefresh }: EmptyStateProps) {
  const t = useTranslations('pluginMarketplace');

  return (
    <Empty className="py-12 sm:py-16 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/10 to-muted/50 animate-pulse">
          <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
        </EmptyMedia>
        <EmptyTitle>{t('empty.noResults')}</EmptyTitle>
        <EmptyDescription>
          {searchQuery 
            ? t('empty.noMatch', { query: searchQuery })
            : t('empty.noFilters')
          }
        </EmptyDescription>
      </EmptyHeader>
      
      <EmptyContent>
        <div className="flex flex-wrap gap-2 justify-center">
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
              <X className="h-4 w-4" />
              {t('empty.clearSearch')}
            </Button>
          )}
          <Button variant="secondary" size="sm" className="gap-2" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
            {t('empty.refresh')}
          </Button>
        </div>
        
        {/* Popular searches */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">{t('empty.popularSearches')}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['AI tools', 'Code analysis', 'Themes', 'Git', 'Markdown'].map((term) => (
              <Button
                key={term}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onSearch?.(term)}
              >
                <Sparkles className="h-3 w-3" />
                {term}
              </Button>
            ))}
          </div>
        </div>
      </EmptyContent>
    </Empty>
  );
}

export default MarketplaceEmptyState;
