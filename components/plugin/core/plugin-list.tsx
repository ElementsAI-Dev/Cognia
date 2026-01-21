'use client';

/**
 * Plugin List - Displays a list of plugins with grid/list view support
 * Enhanced with selection support and better responsive design
 */

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Plugin } from '@/types/plugin';
import { PluginCard } from './plugin-card';
import { PluginQuickActions } from './plugin-quick-actions';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Puzzle } from 'lucide-react';

type ViewMode = 'grid' | 'list';

interface PluginListProps {
  plugins: Plugin[];
  viewMode?: ViewMode;
  onToggle: (plugin: Plugin) => void;
  onConfigure: (plugin: Plugin) => void;
  onUninstall: (plugin: Plugin) => void;
  onViewDetails?: (plugin: Plugin) => void;
  enableSelection?: boolean;
  onBatchEnable?: (pluginIds: string[]) => Promise<void>;
  onBatchDisable?: (pluginIds: string[]) => Promise<void>;
  onBatchUninstall?: (pluginIds: string[]) => Promise<void>;
}

export function PluginList({
  plugins,
  viewMode = 'grid',
  onToggle,
  onConfigure,
  onUninstall,
  onViewDetails,
  enableSelection = false,
  onBatchEnable,
  onBatchDisable,
  onBatchUninstall,
}: PluginListProps) {
  const t = useTranslations('pluginList');
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

  const handleSelectPlugin = useCallback((pluginId: string, selected: boolean) => {
    setSelectedPlugins(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(pluginId);
      } else {
        next.delete(pluginId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedPlugins(new Set(plugins.map(p => p.manifest.id)));
  }, [plugins]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPlugins(new Set());
  }, []);

  const handleBatchEnable = useCallback(async () => {
    if (onBatchEnable) {
      await onBatchEnable(Array.from(selectedPlugins));
      setSelectedPlugins(new Set());
    }
  }, [selectedPlugins, onBatchEnable]);

  const handleBatchDisable = useCallback(async () => {
    if (onBatchDisable) {
      await onBatchDisable(Array.from(selectedPlugins));
      setSelectedPlugins(new Set());
    }
  }, [selectedPlugins, onBatchDisable]);

  const handleBatchUninstall = useCallback(async () => {
    if (onBatchUninstall) {
      await onBatchUninstall(Array.from(selectedPlugins));
      setSelectedPlugins(new Set());
    }
  }, [selectedPlugins, onBatchUninstall]);
  
  if (plugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Puzzle className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-base sm:text-lg font-medium">{t('noPlugins')}</p>
        <p className="text-sm mt-1">{t('noPluginsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quick Actions Bar - shown when selection enabled */}
      {enableSelection && (
        <PluginQuickActions
          plugins={plugins}
          selectedPlugins={selectedPlugins}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onEnableSelected={handleBatchEnable}
          onDisableSelected={handleBatchDisable}
          onUninstallSelected={handleBatchUninstall}
        />
      )}

      {/* Plugin Grid/List */}
      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'flex flex-col gap-2'
        )}
      >
        {plugins.map((plugin) => (
          <div
            key={plugin.manifest.id}
            className={cn(
              'relative',
              enableSelection && selectedPlugins.has(plugin.manifest.id) && 'ring-2 ring-primary rounded-lg'
            )}
          >
            {/* Selection checkbox overlay */}
            {enableSelection && (
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedPlugins.has(plugin.manifest.id)}
                  onCheckedChange={(checked) => 
                    handleSelectPlugin(plugin.manifest.id, checked as boolean)
                  }
                  className="bg-background border-2"
                />
              </div>
            )}
            <PluginCard
              plugin={plugin}
              variant={viewMode === 'list' ? 'compact' : 'card'}
              onToggle={() => onToggle(plugin)}
              onConfigure={() => onConfigure(plugin)}
              onUninstall={() => onUninstall(plugin)}
              onViewDetails={onViewDetails ? () => onViewDetails(plugin) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
