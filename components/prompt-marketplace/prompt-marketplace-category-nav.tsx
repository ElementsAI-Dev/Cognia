'use client';

/**
 * PromptMarketplaceCategoryNav - Category navigation for marketplace
 */

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MARKETPLACE_CATEGORIES, type MarketplaceCategory } from '@/types/prompt-marketplace';

interface PromptMarketplaceCategoryNavProps {
  selected: MarketplaceCategory | 'all';
  onSelect: (category: MarketplaceCategory | 'all') => void;
  showCounts?: Record<string, number>;
}

export function PromptMarketplaceCategoryNav({
  selected,
  onSelect,
  showCounts,
}: PromptMarketplaceCategoryNavProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex items-center gap-2 pb-2">
        {/* All Category */}
        <Button
          variant={selected === 'all' ? 'default' : 'outline'}
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => onSelect('all')}
        >
          <span>🌐</span>
          <span>All</span>
          {showCounts && showCounts['all'] !== undefined && (
            <span className="text-xs opacity-70">({showCounts['all']})</span>
          )}
        </Button>

        {/* Category Buttons */}
        {MARKETPLACE_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={selected === category.id ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'shrink-0 gap-1.5 transition-all',
              selected === category.id && 'ring-1 ring-primary/30'
            )}
            onClick={() => onSelect(category.id)}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
            {showCounts && showCounts[category.id] !== undefined && (
              <span className="text-xs opacity-70">({showCounts[category.id]})</span>
            )}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export default PromptMarketplaceCategoryNav;
