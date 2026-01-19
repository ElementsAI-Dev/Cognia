'use client';

/**
 * Plugin List - Displays a list of plugins with grid/list view support
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import type { Plugin } from '@/types/plugin';
import { PluginCard } from './plugin-card';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

interface PluginListProps {
  plugins: Plugin[];
  viewMode?: ViewMode;
  onToggle: (plugin: Plugin) => void;
  onConfigure: (plugin: Plugin) => void;
  onUninstall: (plugin: Plugin) => void;
}

export function PluginList({
  plugins,
  viewMode = 'grid',
  onToggle,
  onConfigure,
  onUninstall,
}: PluginListProps) {
  const t = useTranslations('pluginList');
  
  if (plugins.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 text-muted-foreground">
        <p>{t('noPlugins')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        viewMode === 'grid'
          ? 'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'flex flex-col gap-2'
      )}
    >
      {plugins.map((plugin) => (
        <PluginCard
          key={plugin.manifest.id}
          plugin={plugin}
          variant={viewMode === 'list' ? 'compact' : 'card'}
          onToggle={() => onToggle(plugin)}
          onConfigure={() => onConfigure(plugin)}
          onUninstall={() => onUninstall(plugin)}
        />
      ))}
    </div>
  );
}
