'use client';

/**
 * MarketplaceEmptyState - Empty state for marketplace search results
 * Uses @ui/empty component for consistent empty state styling
 */

import React from 'react';
import { Search, RefreshCw, ExternalLink, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

export function MarketplaceEmptyState({ searchQuery, onClear, onSearch }: EmptyStateProps) {
  return (
    <Empty className="py-12 sm:py-16 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/10 to-muted/50 animate-pulse">
          <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
        </EmptyMedia>
        <EmptyTitle>No plugins found</EmptyTitle>
        <EmptyDescription>
          {searchQuery 
            ? `No plugins match "${searchQuery}". Try a different search term or adjust your filters.`
            : 'No plugins available with the current filters.'
          }
        </EmptyDescription>
      </EmptyHeader>
      
      <EmptyContent>
        <div className="flex flex-wrap gap-2 justify-center">
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
              <X className="h-4 w-4" />
              Clear Search
            </Button>
          )}
          <Button variant="secondary" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="link" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Suggest a Plugin
          </Button>
        </div>
        
        {/* Popular searches */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">Popular searches:</p>
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
