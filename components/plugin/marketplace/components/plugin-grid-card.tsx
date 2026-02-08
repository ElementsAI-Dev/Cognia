'use client';

/**
 * PluginGridCard - Grid view card for plugins
 */

import React, { useState } from 'react';
import {
  Star,
  Download,
  CheckCircle,
  Flame,
  Sparkles,
  Heart,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PluginCardProps, CategoryFilter } from './marketplace-types';
import { CATEGORY_INFO } from './marketplace-constants';

export function PluginGridCard({
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
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      onClick={() => onViewDetails?.(plugin)}
    >
      <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
            'bg-gradient-to-br from-primary/20 to-primary/5'
          )}>
            {categoryInfo?.icon ? (
              React.createElement(categoryInfo.icon, {
                className: 'h-5 w-5 text-primary',
              })
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {plugin.trending && (
              <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                <Flame className="h-2.5 w-2.5" />
                Hot
              </Badge>
            )}
            {plugin.verified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Verified</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(plugin.id);
              }}
            >
              <Heart className={cn('h-3.5 w-3.5 transition-all', isFavorite && 'fill-red-500 text-red-500')} />
            </Button>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {plugin.name}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{plugin.author.name}</p>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {plugin.description}
        </p>
        
        <Separator className="my-2" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{plugin.rating}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="h-3 w-3" />
              <span>{(plugin.downloadCount / 1000).toFixed(0)}k</span>
            </div>
          </div>
          
          <Button
            size="sm"
            variant={plugin.installed ? 'outline' : 'default'}
            className={cn(
              'h-7 text-xs transition-all',
              plugin.installed && 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800'
            )}
            onClick={handleInstall}
            disabled={isInstalling || plugin.installed}
          >
            {isInstalling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : plugin.installed ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Installed
              </>
            ) : (
              'Install'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PluginGridCard;
