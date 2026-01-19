'use client';

/**
 * Plugin Card - Displays a single plugin with controls
 * Supports both card (grid) and compact (list) variants
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import type { Plugin, PluginCapability } from '@/types/plugin';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from 'lucide-react';
import { InlineLoading } from '@/components/ui/loading-states';
import { cn } from '@/lib/utils';

type PluginCardVariant = 'card' | 'compact';

interface PluginCardProps {
  plugin: Plugin;
  variant?: PluginCardVariant;
  onToggle: () => void;
  onConfigure: () => void;
  onUninstall: () => void;
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
};

export function PluginCard({
  plugin,
  variant = 'card',
  onToggle,
  onConfigure,
  onUninstall,
}: PluginCardProps) {
  const t = useTranslations('pluginCard');
  const { manifest, status, error } = plugin;
  const isEnabled = status === 'enabled';
  const isError = status === 'error';
  const isLoading = status === 'loading' || status === 'enabling' || status === 'disabling';

  // Compact variant - horizontal layout for list view
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors hover:bg-muted/50',
          isError && 'border-destructive'
        )}
      >
        {/* Plugin info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{manifest.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
              v{manifest.version}
            </Badge>
            <Badge
              variant={isEnabled ? 'default' : isError ? 'destructive' : 'secondary'}
              className="text-[10px] px-1.5 py-0 h-5 shrink-0"
            >
              {status}
            </Badge>
            {isLoading && <InlineLoading />}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {manifest.description}
          </p>
          {error && (
            <p className="text-[10px] text-destructive truncate mt-0.5">{error}</p>
          )}
        </div>

        {/* Capabilities - hidden on very small screens */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {manifest.capabilities.slice(0, 3).map((cap) => (
            <Badge key={cap} variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 h-5">
              {capabilityIcons[cap]}
              <span className="hidden lg:inline">{cap}</span>
            </Badge>
          ))}
          {manifest.capabilities.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              +{manifest.capabilities.length - 3}
            </Badge>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
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
              <DropdownMenuItem onClick={onConfigure}>
                <Settings className="h-4 w-4 mr-2" />
                {t('configure')}
              </DropdownMenuItem>
              {manifest.homepage && (
                <DropdownMenuItem
                  onClick={() => window.open(manifest.homepage, '_blank')}
                >
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
  return (
    <Card className={cn('transition-colors hover:border-primary/50', isError && 'border-destructive')}>
      <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base truncate">{manifest.name}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
              v{manifest.version} • {manifest.type}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={isLoading || isError}
              className="scale-90 sm:scale-100"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onConfigure}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('configure')}
                </DropdownMenuItem>
                {manifest.homepage && (
                  <DropdownMenuItem
                    onClick={() => window.open(manifest.homepage, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('homepage')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onUninstall}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('uninstall')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
          {manifest.description}
        </p>
        
        {/* Capabilities */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
          {manifest.capabilities.slice(0, 4).map((cap) => (
            <Badge key={cap} variant="secondary" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1.5 sm:px-2">
              {capabilityIcons[cap]}
              <span className="hidden xs:inline">{cap}</span>
            </Badge>
          ))}
          {manifest.capabilities.length > 4 && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
              +{manifest.capabilities.length - 4}
            </Badge>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge
            variant={isEnabled ? 'default' : isError ? 'destructive' : 'outline'}
            className="text-[10px] sm:text-xs"
          >
            {status}
          </Badge>
          {isLoading && <InlineLoading />}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-[10px] sm:text-xs text-destructive mt-2 line-clamp-2">{error}</p>
        )}

        {/* Plugin stats */}
        <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
          {plugin.tools && plugin.tools.length > 0 && (
            <span>{t('stats.tools', { count: plugin.tools.length })}</span>
          )}
          {plugin.components && plugin.components.length > 0 && (
            <span>{t('stats.components', { count: plugin.components.length })}</span>
          )}
          {plugin.modes && plugin.modes.length > 0 && (
            <span>{t('stats.modes', { count: plugin.modes.length })}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
