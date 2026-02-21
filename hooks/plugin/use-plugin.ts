/**
 * usePlugin - Hook for accessing a specific plugin
 */

import { useMemo, useCallback, useEffect } from 'react';
import { usePluginStore } from '@/stores/plugin';
import type { Plugin, PluginManifest } from '@/types/plugin';
import { getPluginManager } from '@/lib/plugin';

interface UsePluginReturn {
  plugin: Plugin | undefined;
  manifest: PluginManifest | undefined;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  configure: (config: Record<string, unknown>) => void;
}

/**
 * Hook to access and control a specific plugin
 */
export function usePlugin(pluginId: string): UsePluginReturn {
  const { plugins, loading, errors, setPluginConfig } = usePluginStore();

  const plugin = plugins[pluginId];
  const manifest = plugin?.manifest;
  const isEnabled = plugin?.status === 'enabled';
  const isLoading = loading.has(pluginId);
  const error = errors[pluginId] || null;

  const enable = useCallback(async () => {
    await getPluginManager().enablePlugin(pluginId);
  }, [pluginId]);

  const disable = useCallback(async () => {
    await getPluginManager().disablePlugin(pluginId);
  }, [pluginId]);

  const configure = useCallback(
    (config: Record<string, unknown>) => {
      setPluginConfig(pluginId, config);
    },
    [pluginId, setPluginConfig]
  );

  return useMemo(
    () => ({
      plugin,
      manifest,
      isEnabled,
      isLoading,
      error,
      enable,
      disable,
      configure,
    }),
    [plugin, manifest, isEnabled, isLoading, error, enable, disable, configure]
  );
}

/**
 * Hook to get all plugins
 */
export function usePlugins() {
  const { plugins, initialized, loading } = usePluginStore();

  const pluginList = useMemo(() => Object.values(plugins), [plugins]);
  const enabledPlugins = useMemo(
    () => pluginList.filter((p) => p.status === 'enabled'),
    [pluginList]
  );
  const disabledPlugins = useMemo(
    () => pluginList.filter((p) => p.status === 'disabled' || p.status === 'loaded'),
    [pluginList]
  );
  const errorPlugins = useMemo(() => pluginList.filter((p) => p.status === 'error'), [pluginList]);

  return {
    plugins: pluginList,
    enabledPlugins,
    disabledPlugins,
    errorPlugins,
    initialized,
    isLoading: loading.size > 0,
    count: pluginList.length,
    enabledCount: enabledPlugins.length,
  };
}

/**
 * Hook to subscribe to plugin events
 */
export function usePluginEvents(
  eventType: string,
  callback: (event: { type: string; pluginId: string; data?: unknown }) => void
) {
  const addEventListener = usePluginStore((state) => state.addEventListener);

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    const unsubscribe = addEventListener(eventType, callback);
    return unsubscribe;
  }, [eventType, callback, addEventListener]);
}
