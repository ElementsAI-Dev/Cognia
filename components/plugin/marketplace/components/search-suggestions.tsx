'use client';

/**
 * SearchSuggestions - Dropdown showing search history when input is focused
 */

import React from 'react';
import { Clock, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface SearchSuggestionsProps {
  searchHistory: string[];
  onSelect: (term: string) => void;
  onClearHistory: () => void;
  visible: boolean;
}

export function SearchSuggestions({
  searchHistory,
  onSelect,
  onClearHistory,
  visible,
}: SearchSuggestionsProps) {
  const t = useTranslations('pluginMarketplace');

  if (!visible || searchHistory.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">
          {t('search.recentSearches')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onClearHistory();
          }}
        >
          <X className="h-3 w-3 mr-1" />
          {t('search.clearHistory')}
        </Button>
      </div>
      <div className="py-1 max-h-[200px] overflow-y-auto">
        {searchHistory.slice(0, 8).map((term) => (
          <button
            key={term}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
            onClick={() => onSelect(term)}
          >
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{term}</span>
          </button>
        ))}
      </div>
      <div className="px-3 py-2 border-t">
        <div className="flex flex-wrap gap-1.5">
          {['AI tools', 'Code analysis', 'Themes', 'Git'].map((term) => (
            <Button
              key={term}
              variant="outline"
              size="sm"
              className="h-6 text-[10px] gap-1 px-2"
              onClick={() => onSelect(term)}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {term}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchSuggestions;
