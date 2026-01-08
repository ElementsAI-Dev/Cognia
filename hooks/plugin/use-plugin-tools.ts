/**
 * usePluginTools - Hook for accessing plugin tools
 */

import { useMemo, useCallback } from 'react';
import { usePluginStore } from '@/stores/plugin';
import type { PluginTool } from '@/types/plugin';

interface UsePluginToolsReturn {
  tools: PluginTool[];
  getToolByName: (name: string) => PluginTool | undefined;
  getToolsByPlugin: (pluginId: string) => PluginTool[];
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Hook to access all registered plugin tools
 */
export function usePluginTools(): UsePluginToolsReturn {
  const { getAllTools, plugins } = usePluginStore();

  const tools = useMemo(() => getAllTools(), [getAllTools]);

  const getToolByName = useCallback(
    (name: string) => tools.find((t) => t.name === name),
    [tools]
  );

  const getToolsByPlugin = useCallback(
    (pluginId: string) => {
      const plugin = plugins[pluginId];
      return plugin?.tools || [];
    },
    [plugins]
  );

  const executeTool = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      const tool = getToolByName(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      // Check if plugin is enabled
      const plugin = plugins[tool.pluginId];
      if (!plugin || plugin.status !== 'enabled') {
        throw new Error(`Plugin ${tool.pluginId} is not enabled`);
      }

      // Execute the tool
      return tool.execute(args, { config: plugin.config });
    },
    [getToolByName, plugins]
  );

  return useMemo(
    () => ({
      tools,
      getToolByName,
      getToolsByPlugin,
      executeTool,
    }),
    [tools, getToolByName, getToolsByPlugin, executeTool]
  );
}

/**
 * Hook to get tools from a specific plugin
 */
export function usePluginToolsFromPlugin(pluginId: string) {
  const { plugins } = usePluginStore();

  const plugin = plugins[pluginId];
  const tools = useMemo(() => plugin?.tools || [], [plugin?.tools]);
  const isEnabled = plugin?.status === 'enabled';

  const executeTool = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      if (!isEnabled) {
        throw new Error(`Plugin ${pluginId} is not enabled`);
      }

      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      return tool.execute(args, { config: plugin?.config || {} });
    },
    [tools, isEnabled, pluginId, plugin?.config]
  );

  return {
    tools,
    isEnabled,
    executeTool,
  };
}
