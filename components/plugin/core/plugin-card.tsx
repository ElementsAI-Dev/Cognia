'use client';

/**
 * Plugin Card - Displays a single plugin with controls
 */

import React from 'react';
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

interface PluginCardProps {
  plugin: Plugin;
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
  onToggle,
  onConfigure,
  onUninstall,
}: PluginCardProps) {
  const { manifest, status, error } = plugin;
  const isEnabled = status === 'enabled';
  const isError = status === 'error';
  const isLoading = status === 'loading' || status === 'enabling' || status === 'disabling';

  return (
    <Card className={`${isError ? 'border-destructive' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{manifest.name}</CardTitle>
            <CardDescription className="text-xs mt-1">
              v{manifest.version} • {manifest.type}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={isLoading || isError}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onConfigure}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </DropdownMenuItem>
                {manifest.homepage && (
                  <DropdownMenuItem
                    onClick={() => window.open(manifest.homepage, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Homepage
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onUninstall}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Uninstall
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {manifest.description}
        </p>
        
        {/* Capabilities */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {manifest.capabilities.map((cap) => (
            <Badge key={cap} variant="secondary" className="text-xs gap-1">
              {capabilityIcons[cap]}
              {cap}
            </Badge>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge
            variant={
              isEnabled
                ? 'default'
                : isError
                ? 'destructive'
                : 'outline'
            }
            className="text-xs"
          >
            {status}
          </Badge>
          {isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Loading...
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-destructive mt-2 line-clamp-2">{error}</p>
        )}

        {/* Plugin stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {plugin.tools && plugin.tools.length > 0 && (
            <span>{plugin.tools.length} tools</span>
          )}
          {plugin.components && plugin.components.length > 0 && (
            <span>{plugin.components.length} components</span>
          )}
          {plugin.modes && plugin.modes.length > 0 && (
            <span>{plugin.modes.length} modes</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
