'use client';

/**
 * TrendingPluginItem - Trending plugin item for horizontal scroll
 */

import React from 'react';
import { Star, CheckCircle, Flame } from 'lucide-react';
import type { MarketplacePlugin } from './marketplace-types';

interface TrendingPluginItemProps {
  plugin: MarketplacePlugin;
  onClick?: () => void;
}

export function TrendingPluginItem({ plugin, onClick }: TrendingPluginItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border bg-card min-w-[260px] sm:min-w-[300px] hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
        <Flame className="h-5 w-5 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{plugin.name}</span>
          {plugin.verified && (
            <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{plugin.rating}</span>
          <span>·</span>
          <span>{(plugin.downloadCount / 1000).toFixed(0)}k</span>
        </div>
      </div>
    </div>
  );
}

export default TrendingPluginItem;
