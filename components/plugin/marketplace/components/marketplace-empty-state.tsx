'use client';

/**
 * MarketplaceEmptyState - Empty state for marketplace search results
 */

import React from 'react';
import { Search, RefreshCw, ExternalLink, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  searchQuery: string;
  onClear: () => void;
}

export function MarketplaceEmptyState({ searchQuery, onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/10 to-muted/50 flex items-center justify-center mb-4 sm:mb-6 animate-pulse">
        <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold mb-2">No plugins found</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-4 sm:mb-6">
        {searchQuery 
          ? `No plugins match "${searchQuery}". Try a different search term or adjust your filters.`
          : 'No plugins available with the current filters.'
        }
      </p>
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
      
      {/* Suggestions */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground mb-3">Popular searches:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['AI tools', 'Code analysis', 'Themes', 'Git', 'Markdown'].map((term) => (
            <Button
              key={term}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                // Could pass this up to set the search query
              }}
            >
              <Sparkles className="h-3 w-3" />
              {term}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MarketplaceEmptyState;
