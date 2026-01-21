'use client';

/**
 * MarketplaceStatsBar - Statistics bar for the marketplace
 */

import React from 'react';
import { Package, Download, Users, Sparkles } from 'lucide-react';
import { MARKETPLACE_STATS } from './marketplace-constants';

export function MarketplaceStatsBar() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
        <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20">
          <Package className="h-4 w-4 text-blue-500" />
        </div>
        <div>
          <div className="text-base sm:text-lg font-bold">{MARKETPLACE_STATS.totalPlugins.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">Plugins</div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
        <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/20">
          <Download className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <div className="text-base sm:text-lg font-bold">{(MARKETPLACE_STATS.totalDownloads / 1000000).toFixed(1)}M</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">Downloads</div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
        <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20">
          <Users className="h-4 w-4 text-purple-500" />
        </div>
        <div>
          <div className="text-base sm:text-lg font-bold">{MARKETPLACE_STATS.totalDevelopers}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">Developers</div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
        <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/20">
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <div className="text-base sm:text-lg font-bold">+{MARKETPLACE_STATS.weeklyNewPlugins}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">This Week</div>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceStatsBar;
