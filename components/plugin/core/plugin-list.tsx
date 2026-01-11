'use client';

/**
 * Plugin List - Displays a list of plugins
 */

import React from 'react';
import type { Plugin } from '@/types/plugin';
import { PluginCard } from './plugin-card';

interface PluginListProps {
  plugins: Plugin[];
  onToggle: (plugin: Plugin) => void;
  onConfigure: (plugin: Plugin) => void;
  onUninstall: (plugin: Plugin) => void;
}

export function PluginList({
  plugins,
  onToggle,
  onConfigure,
  onUninstall,
}: PluginListProps) {
  if (plugins.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No plugins found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {plugins.map((plugin) => (
        <PluginCard
          key={plugin.manifest.id}
          plugin={plugin}
          onToggle={() => onToggle(plugin)}
          onConfigure={() => onConfigure(plugin)}
          onUninstall={() => onUninstall(plugin)}
        />
      ))}
    </div>
  );
}
