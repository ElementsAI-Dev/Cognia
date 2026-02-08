'use client';

/**
 * PluginListItem - List view item for plugins
 */

import React, { useState } from 'react';
import {
  Star,
  Download,
  CheckCircle,
  Flame,
  Award,
  Sparkles,
  Heart,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PluginCardProps, CategoryFilter } from './marketplace-types';
import { CATEGORY_INFO } from './marketplace-constants';

export function PluginListItem({
  plugin,
  onInstall,
  onViewDetails,
  isFavorite = false,
  onToggleFavorite,
}: PluginCardProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInstall) {
      setIsInstalling(true);
      try {
        await onInstall(plugin.id);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  const categoryInfo = CATEGORY_INFO[plugin.capabilities[0] as CategoryFilter];

  return (
    <div
      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/30 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onViewDetails?.(plugin)}
    >
      <div className={cn(
        'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
        'bg-gradient-to-br from-primary/20 to-primary/5'
      )}>
        {categoryInfo?.icon ? (
          React.createElement(categoryInfo.icon, {
            className: 'h-5 w-5 sm:h-6 sm:w-6 text-primary',
          })
        ) : (
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
            {plugin.name}
          </h4>
          {plugin.verified && (
            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
          )}
          {plugin.trending && (
            <Badge className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
              <Flame className="h-2.5 w-2.5 mr-0.5" />
              Hot
            </Badge>
          )}
          {plugin.featured && (
            <Badge className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Award className="h-2.5 w-2.5 mr-0.5" />
              Featured
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
          {plugin.description}
        </p>
        <div className="flex items-center gap-2 mt-1 sm:hidden">
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{plugin.rating}</span>
          </div>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{(plugin.downloadCount / 1000).toFixed(0)}k</span>
        </div>
      </div>
      
      <div className="hidden sm:flex items-center gap-3 lg:gap-5 shrink-0">
        <div className="hidden lg:flex flex-wrap gap-1 max-w-[180px]">
          {plugin.capabilities.slice(0, 2).map((cap) => (
            <Badge key={cap} variant="secondary" className="text-[10px] px-1.5 py-0">
              {cap}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm min-w-[50px]">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{plugin.rating}</span>
        </div>
        <div className="text-sm text-muted-foreground min-w-[45px]">
          {(plugin.downloadCount / 1000).toFixed(0)}k
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(plugin.id);
          }}
        >
          <Heart className={cn('h-4 w-4 transition-all', isFavorite && 'fill-red-500 text-red-500')} />
        </Button>
        <Button
          size="sm"
          variant={plugin.installed ? 'outline' : 'default'}
          className={cn(
            'h-8 text-xs sm:text-sm transition-all',
            plugin.installed && 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800'
          )}
          onClick={handleInstall}
          disabled={isInstalling || plugin.installed}
        >
          {isInstalling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : plugin.installed ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Installed</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Install</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default PluginListItem;
