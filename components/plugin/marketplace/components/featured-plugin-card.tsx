'use client';

/**
 * FeaturedPluginCard - Featured plugin card with enhanced design
 */

import React, { useState } from 'react';
import {
  Star,
  Download,
  CheckCircle,
  Award,
  Sparkles,
  Heart,
  Loader2,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

export function FeaturedPluginCard({
  plugin,
  onInstall,
  onViewDetails,
}: PluginCardProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

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
      className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-pointer"
      onClick={() => onViewDetails?.(plugin)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {plugin.featured && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-lg text-[10px] sm:text-xs">
            <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Featured
          </Badge>
        </div>
      )}
      
      <CardHeader className="relative p-3 sm:p-4 pb-2">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300',
            'bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/10'
          )}>
            {categoryInfo?.icon ? (
              React.createElement(categoryInfo.icon, {
                className: 'h-5 w-5 sm:h-7 sm:w-7 text-primary',
              })
            ) : (
              <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 pr-16 sm:pr-20">
              <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                {plugin.name}
              </h3>
              {plugin.verified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>Verified Plugin</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5">
              <span className="truncate">{plugin.author.name}</span>
              {plugin.author.verified && (
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 py-0 shrink-0">
                  <Shield className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 sm:static"
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
          >
            <Heart className={cn('h-4 w-4 transition-all', isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'hover:scale-110')} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="relative p-3 sm:p-4 pt-1 sm:pt-2 space-y-2 sm:space-y-3">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {plugin.description}
        </p>
        
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {plugin.capabilities.slice(0, 3).map((cap) => {
            const info = CATEGORY_INFO[cap as CategoryFilter];
            return (
              <Badge
                key={cap}
                variant="secondary"
                className="text-[10px] sm:text-xs gap-0.5 sm:gap-1"
              >
                {info?.icon && React.createElement(info.icon, { className: 'h-2.5 w-2.5 sm:h-3 sm:w-3' })}
                <span className="hidden xs:inline">{cap}</span>
              </Badge>
            );
          })}
          {plugin.capabilities.length > 3 && (
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              +{plugin.capabilities.length - 3}
            </Badge>
          )}
        </div>
        
        <Separator className="my-2" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{plugin.rating}</span>
              <span className="text-muted-foreground text-[10px] sm:text-xs">({plugin.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{(plugin.downloadCount / 1000).toFixed(0)}k</span>
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling || plugin.installed}
            className={cn(
              'h-7 sm:h-8 text-xs sm:text-sm transition-all duration-200',
              plugin.installed && 'bg-emerald-500 hover:bg-emerald-600'
            )}
          >
            {isInstalling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
      </CardContent>
    </Card>
  );
}

export default FeaturedPluginCard;
