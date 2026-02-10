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
import { PluginEmptyState } from './plugin-empty-state';
import { cn } from '@/lib/utils';

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
  isBackgroundActive?: boolean;
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
  isBackgroundActive,
}: PluginListProps) {
  const _t = useTranslations('pluginList');
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

  const handleSelectPlugin = useCallback((pluginId: string, selected: boolean) => {
    setSelectedPlugins((prev) => {
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
    setSelectedPlugins(new Set(plugins.map((p) => p.manifest.id)));
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
    return <PluginEmptyState variant="no-plugins" isBackgroundActive={isBackgroundActive} />;
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

      {/* Plugin Grid/List - Enhanced responsive grid */}
      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
            : 'flex flex-col gap-3'
        )}
      >
        {plugins.map((plugin, index) => (
          <div
            key={plugin.manifest.id}
            className={cn(
              'relative group/item',
              enableSelection &&
                selectedPlugins.has(plugin.manifest.id) &&
                'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl'
            )}
            style={{
              animationDelay: `${index * 30}ms`,
            }}
          >
            {/* Selection checkbox overlay - Enhanced positioning */}
            {enableSelection && (
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={selectedPlugins.has(plugin.manifest.id)}
                  onCheckedChange={(checked) =>
                    handleSelectPlugin(plugin.manifest.id, checked as boolean)
                  }
                  className="h-5 w-5 bg-background/90 backdrop-blur-sm border-2 shadow-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
