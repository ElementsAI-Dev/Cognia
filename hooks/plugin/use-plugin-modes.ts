/**
 * usePluginModes - Hook for accessing plugin-provided agent modes
 */

import { useMemo } from 'react';
import { usePluginStore } from '@/stores/plugin';
import type { AgentModeConfig } from '@/types/agent/agent-mode';

interface UsePluginModesReturn {
  modes: AgentModeConfig[];
  getModeById: (id: string) => AgentModeConfig | undefined;
  getModesByPlugin: (pluginId: string) => AgentModeConfig[];
}

/**
 * Hook to access all registered plugin modes
 */
export function usePluginModes(): UsePluginModesReturn {
  const { getAllModes, plugins } = usePluginStore();

  const modes = useMemo(() => getAllModes(), [getAllModes]);

  const getModeById = useMemo(
    () => (id: string) => modes.find((m) => m.id === id),
    [modes]
  );

  const getModesByPlugin = useMemo(
    () => (pluginId: string) => {
      const plugin = plugins[pluginId];
      return plugin?.modes || [];
    },
    [plugins]
  );

  return useMemo(
    () => ({
      modes,
      getModeById,
      getModesByPlugin,
    }),
    [modes, getModeById, getModesByPlugin]
  );
}

/**
 * Hook to get modes from a specific plugin
 */
export function usePluginModesFromPlugin(pluginId: string) {
  const { plugins } = usePluginStore();

  const plugin = plugins[pluginId];
  const modes = useMemo(() => plugin?.modes || [], [plugin?.modes]);
  const isEnabled = plugin?.status === 'enabled';

  return {
    modes,
    isEnabled,
    count: modes.length,
  };
}
