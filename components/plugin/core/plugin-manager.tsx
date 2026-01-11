'use client';

/**
 * Plugin Manager - Main plugin management interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePluginStore } from '@/stores/plugin';
import { PluginList } from './plugin-list';
import { PluginConfig } from '../config/plugin-config';
import type { Plugin } from '@/types/plugin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Settings,
  Package,
  Code,
  Puzzle,
  RefreshCw,
} from 'lucide-react';

interface PluginManagerProps {
  className?: string;
}

export function PluginManager({ className }: PluginManagerProps) {
  const {
    plugins,
    initialized,
    scanPlugins,
    enablePlugin,
    disablePlugin,
    uninstallPlugin,
  } = usePluginStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [installSource, setInstallSource] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter plugins based on search
  const filteredPlugins = Object.values(plugins).filter((plugin) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      plugin.manifest.name.toLowerCase().includes(query) ||
      plugin.manifest.description.toLowerCase().includes(query) ||
      plugin.manifest.id.toLowerCase().includes(query)
    );
  });

  // Categorize plugins
  const enabledPlugins = filteredPlugins.filter((p) => p.status === 'enabled');
  const disabledPlugins = filteredPlugins.filter(
    (p) => p.status === 'disabled' || p.status === 'loaded' || p.status === 'installed'
  );
  const errorPlugins = filteredPlugins.filter((p) => p.status === 'error');

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await scanPlugins();
    } finally {
      setIsLoading(false);
    }
  }, [scanPlugins]);

  // Handle enable/disable
  const handleTogglePlugin = useCallback(
    async (plugin: Plugin) => {
      try {
        if (plugin.status === 'enabled') {
          await disablePlugin(plugin.manifest.id);
        } else {
          await enablePlugin(plugin.manifest.id);
        }
      } catch (error) {
        console.error('Failed to toggle plugin:', error);
      }
    },
    [enablePlugin, disablePlugin]
  );

  // Handle uninstall
  const handleUninstall = useCallback(
    async (plugin: Plugin) => {
      if (confirm(`Are you sure you want to uninstall "${plugin.manifest.name}"?`)) {
        try {
          await uninstallPlugin(plugin.manifest.id);
        } catch (error) {
          console.error('Failed to uninstall plugin:', error);
        }
      }
    },
    [uninstallPlugin]
  );

  // Handle configure
  const handleConfigure = useCallback((plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setIsConfigOpen(true);
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialized) {
      handleRefresh();
    }
  }, [initialized, handleRefresh]);

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Plugins</h2>
          <span className="text-sm text-muted-foreground">
            ({Object.keys(plugins).length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isInstallOpen} onOpenChange={setIsInstallOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Install
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Install Plugin</DialogTitle>
                <DialogDescription>
                  Install a plugin from a local directory or URL.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plugin Source</label>
                  <Input
                    placeholder="Path to plugin directory or git URL"
                    value={installSource}
                    onChange={(e) => setInstallSource(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsInstallOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      // Install logic would go here
                      setIsInstallOpen(false);
                      setInstallSource('');
                    }}
                    disabled={!installSource}
                  >
                    Install
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plugins..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Plugin Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="all" className="gap-2">
              <Package className="h-4 w-4" />
              All ({filteredPlugins.length})
            </TabsTrigger>
            <TabsTrigger value="enabled" className="gap-2">
              <Code className="h-4 w-4" />
              Enabled ({enabledPlugins.length})
            </TabsTrigger>
            <TabsTrigger value="disabled" className="gap-2">
              <Settings className="h-4 w-4" />
              Disabled ({disabledPlugins.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="all" className="m-0 p-4">
            <PluginList
              plugins={filteredPlugins}
              onToggle={handleTogglePlugin}
              onConfigure={handleConfigure}
              onUninstall={handleUninstall}
            />
          </TabsContent>
          <TabsContent value="enabled" className="m-0 p-4">
            <PluginList
              plugins={enabledPlugins}
              onToggle={handleTogglePlugin}
              onConfigure={handleConfigure}
              onUninstall={handleUninstall}
            />
          </TabsContent>
          <TabsContent value="disabled" className="m-0 p-4">
            <PluginList
              plugins={disabledPlugins}
              onToggle={handleTogglePlugin}
              onConfigure={handleConfigure}
              onUninstall={handleUninstall}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Error plugins banner */}
      {errorPlugins.length > 0 && (
        <div className="p-4 border-t bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {errorPlugins.length} plugin(s) have errors
            </span>
          </div>
        </div>
      )}

      {/* Config Dialog */}
      {selectedPlugin && (
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure {selectedPlugin.manifest.name}</DialogTitle>
            </DialogHeader>
            <PluginConfig
              plugin={selectedPlugin}
              onClose={() => setIsConfigOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
