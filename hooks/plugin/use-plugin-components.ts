/**
 * usePluginComponents - Hook for accessing plugin-provided A2UI components
 */

import { useMemo, useCallback } from 'react';
import { usePluginStore } from '@/stores/plugin';
import type { PluginA2UIComponent } from '@/types/plugin';

interface UsePluginComponentsReturn {
  components: PluginA2UIComponent[];
  getComponentByType: (type: string) => PluginA2UIComponent | undefined;
  getComponentsByPlugin: (pluginId: string) => PluginA2UIComponent[];
  getComponentsByCategory: (category: string) => PluginA2UIComponent[];
}

/**
 * Hook to access all registered plugin components
 */
export function usePluginComponents(): UsePluginComponentsReturn {
  const { getAllComponents, plugins } = usePluginStore();

  const components = useMemo(() => getAllComponents(), [getAllComponents]);

  const getComponentByType = useCallback(
    (type: string) => components.find((c) => c.type === type),
    [components]
  );

  const getComponentsByPlugin = useCallback(
    (pluginId: string) => {
      const plugin = plugins[pluginId];
      return plugin?.components || [];
    },
    [plugins]
  );

  const getComponentsByCategory = useCallback(
    (category: string) =>
      components.filter((c) => c.metadata.category === category),
    [components]
  );

  return useMemo(
    () => ({
      components,
      getComponentByType,
      getComponentsByPlugin,
      getComponentsByCategory,
    }),
    [components, getComponentByType, getComponentsByPlugin, getComponentsByCategory]
  );
}

/**
 * Hook to get components from a specific plugin
 */
export function usePluginComponentsFromPlugin(pluginId: string) {
  const { plugins } = usePluginStore();

  const plugin = plugins[pluginId];
  const components = useMemo(() => plugin?.components || [], [plugin?.components]);
  const isEnabled = plugin?.status === 'enabled';

  return {
    components,
    isEnabled,
    count: components.length,
  };
}

/**
 * Hook to get a plugin component by type
 */
export function usePluginComponent(type: string) {
  const { getAllComponents, plugins } = usePluginStore();

  const component = useMemo(() => {
    const components = getAllComponents();
    const found = components.find((c) => c.type === type);
    
    if (!found) {
      return null;
    }

    // Check if plugin is enabled
    const plugin = plugins[found.pluginId];
    if (!plugin || plugin.status !== 'enabled') {
      return null;
    }

    return found;
  }, [type, getAllComponents, plugins]);

  return {
    component: component?.component || null,
    metadata: component?.metadata || null,
    pluginId: component?.pluginId || null,
    isAvailable: component !== null,
  };
}
