'use client';

/**
 * Plugin Card - Displays a single plugin with controls
 * Supports both card (grid) and compact (list) variants
 * Enhanced with animations, favorites, and better visual design
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import type { Plugin, PluginCapability } from '@/types/plugin';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MoreVertical,
  Settings,
  Trash2,
  ExternalLink,
  Code,
  Wrench,
  Palette,
  Terminal,
  Layers,
  Zap,
  LayoutGrid,
  FileCode2,
  Heart,
  Info,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { InlineLoading } from '@/components/ui/loading-states';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { usePluginMarketplaceStore } from '@/stores/plugin';
import { TRANSPARENCY_CONFIG } from '@/lib/constants/transparency';

type PluginCardVariant = 'card' | 'compact';

interface PluginCardProps {
  plugin: Plugin;
  variant?: PluginCardVariant;
  onToggle: () => void;
  onConfigure: () => void;
  onUninstall: () => void;
  onViewDetails?: () => void;
  showFavorite?: boolean;
  /** Whether to show gradient background effect */
  showGradientBackground?: boolean;
  /** Whether to enable hover animation */
  enableHoverAnimation?: boolean;
  /** Animation delay in ms for staggered entry */
  animationDelay?: number;
}

const capabilityIcons: Record<PluginCapability, React.ReactNode> = {
  tools: <Wrench className="h-3 w-3" />,
  components: <Layers className="h-3 w-3" />,
  modes: <Zap className="h-3 w-3" />,
  skills: <Code className="h-3 w-3" />,
  themes: <Palette className="h-3 w-3" />,
  commands: <Terminal className="h-3 w-3" />,
  hooks: <Code className="h-3 w-3" />,
  processors: <Code className="h-3 w-3" />,
  providers: <Code className="h-3 w-3" />,
  exporters: <Code className="h-3 w-3" />,
  importers: <Code className="h-3 w-3" />,
  a2ui: <LayoutGrid className="h-3 w-3" />,
  python: <FileCode2 className="h-3 w-3" />,
  scheduler: <Code className="h-3 w-3" />,
};

export function PluginCard({
  plugin,
  variant = 'card',
  onToggle,
  onConfigure,
  onUninstall,
  onViewDetails,
  showFavorite = true,
  showGradientBackground = true,
  enableHoverAnimation = true,
  animationDelay = 0,
}: PluginCardProps) {
  const t = useTranslations('pluginCard');
  const { manifest, status, error } = plugin;
  const isEnabled = status === 'enabled';
  const isError = status === 'error';
  const isLoading = status === 'loading' || status === 'enabling' || status === 'disabling';
  const { favorites, toggleFavorite } = usePluginMarketplaceStore();
  const isFavorite = !!favorites[manifest.id];
  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const isBackgroundActive = backgroundSettings.enabled && backgroundSettings.source !== 'none';

  // Get status styling
  const getStatusConfig = () => {
    if (isEnabled) return { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
    if (isError) return { color: 'text-red-500', bg: 'bg-red-500/10', icon: Shield };
    return { color: 'text-muted-foreground', bg: 'bg-muted', icon: Info };
  };
  const statusConfig = getStatusConfig();

  // Compact variant - horizontal layout for list view
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
          isBackgroundActive ? TRANSPARENCY_CONFIG.card : 'bg-card',
          'hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm',
          isError && 'border-destructive/50 hover:border-destructive'
        )}
      >
        {/* Plugin icon */}
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            isEnabled ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          {capabilityIcons[manifest.capabilities[0]] || <Zap className="h-4 w-4" />}
        </div>

        {/* Plugin info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {manifest.name}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
              v{manifest.version}
            </Badge>
            <Badge
              variant={isEnabled ? 'default' : isError ? 'destructive' : 'secondary'}
              className={cn('text-[10px] px-1.5 py-0 h-5 shrink-0', isEnabled && 'bg-green-500')}
            >
              {status}
            </Badge>
            {isLoading && <InlineLoading />}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{manifest.description}</p>
          {error && <p className="text-[10px] text-destructive truncate mt-0.5">{error}</p>}
        </div>

        {/* Capabilities - hidden on very small screens */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {manifest.capabilities.slice(0, 3).map((cap) => (
            <TooltipProvider key={cap}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="text-[10px] gap-0.5 px-1.5 py-0 h-5 cursor-help"
                  >
                    {capabilityIcons[cap]}
                    <span className="hidden lg:inline">{cap}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="capitalize">{cap}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {manifest.capabilities.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              +{manifest.capabilities.length - 3}
            </Badge>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {showFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(manifest.id);
              }}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
            </Button>
          )}
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            disabled={isLoading || isError}
            className="scale-90"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={onViewDetails}>
                  <Info className="h-4 w-4 mr-2" />
                  {t('viewDetails')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onConfigure}>
                <Settings className="h-4 w-4 mr-2" />
                {t('configure')}
              </DropdownMenuItem>
              {manifest.homepage && (
                <DropdownMenuItem onClick={() => window.open(manifest.homepage, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('homepage')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onUninstall} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('uninstall')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Card variant - default grid view
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        isBackgroundActive ? TRANSPARENCY_CONFIG.card : undefined,
        // Enhanced hover effects
        enableHoverAnimation && 'hover:shadow-lg hover:-translate-y-0.5',
        'hover:border-primary/40',
        isError && 'border-destructive/50 hover:border-destructive',
        // Enabled state ring effect
        isEnabled && 'ring-1 ring-primary/20 bg-primary/5',
        // Entry animation
        'animate-in fade-in slide-in-from-bottom-4'
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
    >
      {/* Status gradient bar at top */}
      {showGradientBackground && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1 transition-opacity duration-300',
            isEnabled ? 'bg-gradient-to-r from-primary/50 to-primary/20' :
            isError ? 'bg-gradient-to-r from-destructive/50 to-destructive/20' :
            'bg-transparent'
          )}
        />
      )}

      <CardHeader className="relative p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            {/* Plugin Icon */}
            <div
              className={cn(
                'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                isEnabled ? 'bg-primary/10' : 'bg-muted'
              )}
            >
              <div className={cn('scale-125', isEnabled && 'text-primary')}>
                {capabilityIcons[manifest.capabilities[0]] || <Zap className="h-5 w-5" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                {manifest.name}
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 flex items-center gap-1.5">
                <span>v{manifest.version}</span>
                <span>•</span>
                <span className="capitalize">{manifest.type}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {showFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(manifest.id);
                }}
              >
                <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem onClick={onViewDetails}>
                    <Info className="h-4 w-4 mr-2" />
                    {t('viewDetails')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onConfigure}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('configure')}
                </DropdownMenuItem>
                {manifest.homepage && (
                  <DropdownMenuItem onClick={() => window.open(manifest.homepage, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('homepage')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onUninstall} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('uninstall')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative p-4 sm:p-5 pt-0">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {manifest.description}
        </p>

        {/* Capabilities - Enhanced pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {manifest.capabilities.slice(0, 4).map((cap) => (
            <TooltipProvider key={cap}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="text-[10px] sm:text-xs gap-1 px-2 py-0.5 cursor-help bg-muted/60 hover:bg-muted transition-colors"
                  >
                    {capabilityIcons[cap]}
                    <span className="hidden xs:inline capitalize">{cap}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="capitalize">{cap}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {manifest.capabilities.length > 4 && (
            <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0.5 text-muted-foreground">
              +{manifest.capabilities.length - 4}
            </Badge>
          )}
        </div>

        {/* Status and Toggle - Enhanced with better separation */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium',
              statusConfig.bg
            )}>
              <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
              <span className={cn('capitalize', statusConfig.color)}>
                {status}
              </span>
            </div>
            {isLoading && <InlineLoading />}
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            disabled={isLoading || isError}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-[10px] sm:text-xs text-destructive mt-2 line-clamp-2 p-2 bg-destructive/10 rounded-md">
            {error}
          </p>
        )}

        {/* Plugin stats */}
        {plugin.tools?.length || plugin.components?.length || plugin.modes?.length ? (
          <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
            {plugin.tools && plugin.tools.length > 0 && (
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {t('stats.tools', { count: plugin.tools.length })}
              </span>
            )}
            {plugin.components && plugin.components.length > 0 && (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {t('stats.components', { count: plugin.components.length })}
              </span>
            )}
            {plugin.modes && plugin.modes.length > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {t('stats.modes', { count: plugin.modes.length })}
              </span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
