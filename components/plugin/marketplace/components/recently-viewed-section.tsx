'use client';

/**
 * RecentlyViewedSection - Shows recently viewed plugins
 */

import React from 'react';
import { Clock, Star, CheckCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTranslations } from 'next-intl';
import type { MarketplacePlugin } from './marketplace-types';

interface RecentlyViewedSectionProps {
  plugins: MarketplacePlugin[];
  onViewDetails?: (plugin: MarketplacePlugin) => void;
}

export function RecentlyViewedSection({ plugins, onViewDetails }: RecentlyViewedSectionProps) {
  const t = useTranslations('pluginMarketplace');

  if (plugins.length === 0) return null;

  return (
    <div className="p-4 sm:px-6 border-b bg-muted/10">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm sm:text-base">{t('recentlyViewed.title')}</h3>
        <span className="text-xs text-muted-foreground">({plugins.length})</span>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {plugins.slice(0, 8).map((plugin) => (
            <div
              key={plugin.id}
              className="flex items-center gap-3 p-3 rounded-xl border bg-card min-w-[240px] sm:min-w-[280px] hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => onViewDetails?.(plugin)}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/5 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {plugin.name}
                  </span>
                  {plugin.verified && (
                    <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{plugin.rating}</span>
                  <span>·</span>
                  <span>{plugin.author.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export default RecentlyViewedSection;
