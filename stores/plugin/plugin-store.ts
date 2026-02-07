/**
 * Plugin Store - Zustand store for managing plugin state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type {
  Plugin,
  PluginManifest,
  PluginStatus,
  PluginSource,
  PluginStoreState,
  PluginTool,
  PluginA2UIComponent,
  PluginCommand,
  PluginHooks,
  PluginSystemEvent,
} from '@/types/plugin';
import type { AgentModeConfig } from '@/types/agent/agent-mode';
import { validatePluginManifest } from '@/lib/plugin';
import { loggers } from '@/lib/logger';

const log = loggers.plugin;

// =============================================================================
// Store State Interface
// =============================================================================

interface PluginState extends PluginStoreState {
  // Actions - Plugin Lifecycle
  discoverPlugin: (manifest: PluginManifest, source: PluginSource, path: string) => void;
  installPlugin: (pluginId: string) => Promise<void>;
  loadPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  unloadPlugin: (pluginId: string) => Promise<void>;
  uninstallPlugin: (pluginId: string, options?: { skipFileRemoval?: boolean }) => Promise<void>;

  // Actions - Plugin State
  setPluginStatus: (pluginId: string, status: PluginStatus) => void;
  setPluginError: (pluginId: string, error: string | null) => void;
  setPluginConfig: (pluginId: string, config: Record<string, unknown>) => void;
  updatePluginConfig: (pluginId: string, updates: Record<string, unknown>) => void;
  updateLastUsedAt: (pluginId: string) => void;

  // Actions - Plugin Registration
  registerPluginHooks: (pluginId: string, hooks: PluginHooks) => void;
  registerPluginTool: (pluginId: string, tool: PluginTool) => void;
  unregisterPluginTool: (pluginId: string, toolName: string) => void;
  registerPluginComponent: (pluginId: string, component: PluginA2UIComponent) => void;
  unregisterPluginComponent: (pluginId: string, componentType: string) => void;
  registerPluginMode: (pluginId: string, mode: AgentModeConfig) => void;
  unregisterPluginMode: (pluginId: string, modeId: string) => void;
  registerPluginCommand: (pluginId: string, command: PluginCommand) => void;
  unregisterPluginCommand: (pluginId: string, commandId: string) => void;

  // Actions - System
  initialize: (pluginDirectory: string) => Promise<void>;
  scanPlugins: () => Promise<void>;
  getPlugin: (pluginId: string) => Plugin | undefined;
  getEnabledPlugins: () => Plugin[];
  getPluginsByCapability: (capability: string) => Plugin[];
  getAllTools: () => PluginTool[];
  getAllComponents: () => PluginA2UIComponent[];
  getAllModes: () => AgentModeConfig[];
  getAllCommands: () => PluginCommand[];

  // Events
  eventListeners: Map<string, Set<(event: PluginSystemEvent) => void>>;
  addEventListener: (type: string, listener: (event: PluginSystemEvent) => void) => () => void;
  emitEvent: (event: PluginSystemEvent) => void;

  // Reset
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: PluginStoreState & {
  eventListeners: Map<string, Set<(event: PluginSystemEvent) => void>>;
} = {
  plugins: {},
  loadOrder: [],
  loading: new Set(),
  errors: {},
  initialized: false,
  pluginDirectory: '',
  eventListeners: new Map(),
};

// =============================================================================
// Store Implementation
// =============================================================================

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =====================================================================
      // Plugin Lifecycle Actions
      // =====================================================================

      discoverPlugin: (manifest, source, path) => {
        const plugin: Plugin = {
          manifest,
          status: 'discovered',
          source,
          path,
          config: manifest.defaultConfig || {},
        };

        set((state) => ({
          plugins: { ...state.plugins, [manifest.id]: plugin },
        }));

        get().emitEvent({ type: 'plugin:discovered', pluginId: manifest.id, manifest });
      },

      installPlugin: async (pluginId) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) {
          throw new Error(`Plugin not found: ${pluginId}`);
        }

        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...plugin, status: 'installed', installedAt: new Date() },
          },
        }));

        get().emitEvent({ type: 'plugin:installed', pluginId });
      },

      loadPlugin: async (pluginId) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) {
          throw new Error(`Plugin not found: ${pluginId}`);
        }

        if (plugin.status !== 'installed' && plugin.status !== 'disabled') {
          throw new Error(`Plugin ${pluginId} cannot be loaded from status: ${plugin.status}`);
        }

        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...plugin, status: 'loading' },
          },
          loading: new Set([...state.loading, pluginId]),
        }));

        try {
          // Load plugin module - this will be handled by the plugin manager
          // For now, just update status
          set((state) => {
            const newLoading = new Set(state.loading);
            newLoading.delete(pluginId);
            return {
              plugins: {
                ...state.plugins,
                [pluginId]: { ...state.plugins[pluginId], status: 'loaded' },
              },
              loading: newLoading,
              loadOrder: [...state.loadOrder.filter((id) => id !== pluginId), pluginId],
            };
          });

          get().emitEvent({ type: 'plugin:loaded', pluginId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set((state) => {
            const newLoading = new Set(state.loading);
            newLoading.delete(pluginId);
            return {
              plugins: {
                ...state.plugins,
                [pluginId]: { ...state.plugins[pluginId], status: 'error', error: errorMessage },
              },
              loading: newLoading,
              errors: { ...state.errors, [pluginId]: errorMessage },
            };
          });

          get().emitEvent({ type: 'plugin:error', pluginId, error: errorMessage });
          throw error;
        }
      },

      enablePlugin: async (pluginId) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) {
          throw new Error(`Plugin not found: ${pluginId}`);
        }

        if (plugin.status !== 'loaded' && plugin.status !== 'disabled') {
          throw new Error(`Plugin ${pluginId} cannot be enabled from status: ${plugin.status}`);
        }

        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...plugin, status: 'enabling' },
          },
        }));

        try {
          // Call onEnable hook if available
          if (plugin.hooks?.onEnable) {
            await plugin.hooks.onEnable();
          }

          set((state) => ({
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...state.plugins[pluginId],
                status: 'enabled',
                enabledAt: new Date(),
                lastUsedAt: Date.now(),
              },
            },
          }));

          get().emitEvent({ type: 'plugin:enabled', pluginId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set((state) => ({
            plugins: {
              ...state.plugins,
              [pluginId]: { ...state.plugins[pluginId], status: 'error', error: errorMessage },
            },
            errors: { ...state.errors, [pluginId]: errorMessage },
          }));

          get().emitEvent({ type: 'plugin:error', pluginId, error: errorMessage });
          throw error;
        }
      },

      disablePlugin: async (pluginId) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) {
          throw new Error(`Plugin not found: ${pluginId}`);
        }

        if (plugin.status !== 'enabled') {
          throw new Error(`Plugin ${pluginId} cannot be disabled from status: ${plugin.status}`);
        }

        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...plugin, status: 'disabling' },
          },
        }));

        try {
          // Call onDisable hook if available
          if (plugin.hooks?.onDisable) {
            await plugin.hooks.onDisable();
          }

          set((state) => ({
            plugins: {
              ...state.plugins,
              [pluginId]: { ...state.plugins[pluginId], status: 'disabled' },
            },
          }));

          get().emitEvent({ type: 'plugin:disabled', pluginId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set((state) => ({
            plugins: {
              ...state.plugins,
              [pluginId]: { ...state.plugins[pluginId], status: 'error', error: errorMessage },
            },
            errors: { ...state.errors, [pluginId]: errorMessage },
          }));

          get().emitEvent({ type: 'plugin:error', pluginId, error: errorMessage });
          throw error;
        }
      },

      unloadPlugin: async (pluginId) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) {
          throw new Error(`Plugin not found: ${pluginId}`);
        }

        // Must disable first if enabled
        if (plugin.status === 'enabled') {
          await get().disablePlugin(pluginId);
        }

        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...state.plugins[pluginId], status: 'unloading' },
          },
        }));

        try {
          // Call onUnload hook if available
          if (plugin.hooks?.onUnload) {
            await plugin.hooks.onUnload();
          }

          set((state) => ({
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...state.plugins[pluginId],
                status: 'installed',
                hooks: undefined,
                tools: undefined,
                components: undefined,
                modes: undefined,
                commands: undefined,
              },
            },
            loadOrder: state.loadOrder.filter((id) => id !== pluginId),
          }));

          get().emitEvent({ type: 'plugin:unloaded', pluginId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set((state) => ({
            plugins: {
              ...state.plugins,
              [pluginId]: { ...state.plugins[pluginId], status: 'error', error: errorMessage },
            },
            errors: { ...state.errors, [pluginId]: errorMessage },
          }));

          get().emitEvent({ type: 'plugin:error', pluginId, error: errorMessage });
          throw error;
        }
      },

      uninstallPlugin: async (pluginId, options) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) {
          throw new Error(`Plugin not found: ${pluginId}`);
        }

        // Unload first if loaded
        if (['loaded', 'enabled', 'disabled'].includes(plugin.status)) {
          await get().unloadPlugin(pluginId);
        }

        if (!options?.skipFileRemoval) {
          try {
            await invoke('plugin_uninstall', {
              pluginId,
              pluginPath: plugin.path,
            });
          } catch (error) {
            throw new Error(
              `Failed to uninstall plugin files: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        set((state) => {
          const { [pluginId]: _, ...remainingPlugins } = state.plugins;
          const { [pluginId]: __, ...remainingErrors } = state.errors;
          return {
            plugins: remainingPlugins,
            errors: remainingErrors,
            loadOrder: state.loadOrder.filter((id) => id !== pluginId),
          };
        });

        get().emitEvent({ type: 'plugin:uninstalled', pluginId });
      },

      // =====================================================================
      // Plugin State Actions
      // =====================================================================

      setPluginStatus: (pluginId, status) => {
        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...state.plugins[pluginId], status },
          },
        }));
      },

      setPluginError: (pluginId, error) => {
        set((state) => {
          if (error === null) {
            const { [pluginId]: _, ...remainingErrors } = state.errors;
            return {
              plugins: {
                ...state.plugins,
                [pluginId]: { ...state.plugins[pluginId], error: undefined },
              },
              errors: remainingErrors,
            };
          }
          return {
            plugins: {
              ...state.plugins,
              [pluginId]: { ...state.plugins[pluginId], status: 'error', error },
            },
            errors: { ...state.errors, [pluginId]: error },
          };
        });
      },

      setPluginConfig: (pluginId, config) => {
        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...state.plugins[pluginId], config },
          },
        }));

        const plugin = get().plugins[pluginId];
        if (plugin?.hooks?.onConfigChange) {
          plugin.hooks.onConfigChange(config);
        }

        get().emitEvent({ type: 'plugin:config-changed', pluginId, config });
      },

      updatePluginConfig: (pluginId, updates) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) return;

        const newConfig = { ...plugin.config, ...updates };
        get().setPluginConfig(pluginId, newConfig);
      },

      updateLastUsedAt: (pluginId) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) return;

        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...state.plugins[pluginId], lastUsedAt: Date.now() },
          },
        }));
      },

      // =====================================================================
      // Plugin Registration Actions
      // =====================================================================

      registerPluginHooks: (pluginId, hooks) => {
        set((state) => ({
          plugins: {
            ...state.plugins,
            [pluginId]: { ...state.plugins[pluginId], hooks },
          },
        }));
      },

      registerPluginTool: (pluginId, tool) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin) return state;

          const existingTools = plugin.tools || [];
          const filteredTools = existingTools.filter((t) => t.name !== tool.name);

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: { ...plugin, tools: [...filteredTools, tool] },
            },
          };
        });
      },

      unregisterPluginTool: (pluginId, toolName) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin || !plugin.tools) return state;

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...plugin,
                tools: plugin.tools.filter((t) => t.name !== toolName),
              },
            },
          };
        });
      },

      registerPluginComponent: (pluginId, component) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin) return state;

          const existingComponents = plugin.components || [];
          const filteredComponents = existingComponents.filter((c) => c.type !== component.type);

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...plugin,
                components: [...filteredComponents, component],
              },
            },
          };
        });
      },

      unregisterPluginComponent: (pluginId, componentType) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin || !plugin.components) return state;

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...plugin,
                components: plugin.components.filter((c) => c.type !== componentType),
              },
            },
          };
        });
      },

      registerPluginMode: (pluginId, mode) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin) return state;

          const existingModes = plugin.modes || [];
          const filteredModes = existingModes.filter((m) => m.id !== mode.id);

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: { ...plugin, modes: [...filteredModes, mode] },
            },
          };
        });
      },

      unregisterPluginMode: (pluginId, modeId) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin || !plugin.modes) return state;

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...plugin,
                modes: plugin.modes.filter((m) => m.id !== modeId),
              },
            },
          };
        });
      },

      registerPluginCommand: (pluginId, command) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin) return state;

          const existingCommands = plugin.commands || [];
          const filteredCommands = existingCommands.filter((c) => c.id !== command.id);

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...plugin,
                commands: [...filteredCommands, command],
              },
            },
          };
        });
      },

      unregisterPluginCommand: (pluginId, commandId) => {
        set((state) => {
          const plugin = state.plugins[pluginId];
          if (!plugin || !plugin.commands) return state;

          return {
            plugins: {
              ...state.plugins,
              [pluginId]: {
                ...plugin,
                commands: plugin.commands.filter((c) => c.id !== commandId),
              },
            },
          };
        });
      },

      // =====================================================================
      // System Actions
      // =====================================================================

      initialize: async (pluginDirectory) => {
        set({ pluginDirectory, initialized: true });
      },

      scanPlugins: async () => {
        const { pluginDirectory } = get();
        if (!pluginDirectory) return;

        try {
          const results = await invoke<Array<{ manifest: PluginManifest; path: string }>>(
            'plugin_scan_directory',
            {
              directory: pluginDirectory,
            }
          );

          const validResults = results.filter((r) => {
            const validation = validatePluginManifest(r.manifest);
            return validation.valid;
          });

          set((state) => {
            const nextPlugins = { ...state.plugins };

            for (const { manifest, path } of validResults) {
              const existing = nextPlugins[manifest.id];
              if (!existing) {
                nextPlugins[manifest.id] = {
                  manifest,
                  status: 'installed',
                  source: 'local',
                  path,
                  config: (manifest.defaultConfig as Record<string, unknown>) || {},
                  installedAt: new Date(),
                };
                continue;
              }

              nextPlugins[manifest.id] = {
                ...existing,
                manifest,
                path,
              };
            }

            return {
              plugins: nextPlugins,
            };
          });
        } catch (error) {
          log.error('Failed to scan plugins', error as Error);
        }
      },

      getPlugin: (pluginId) => {
        return get().plugins[pluginId];
      },

      getEnabledPlugins: () => {
        return Object.values(get().plugins).filter((p) => p.status === 'enabled');
      },

      getPluginsByCapability: (capability) => {
        return Object.values(get().plugins).filter(
          (p) => p.status === 'enabled' && p.manifest.capabilities.includes(capability as never)
        );
      },

      getAllTools: () => {
        const enabledPlugins = get().getEnabledPlugins();
        return enabledPlugins.flatMap((p) => p.tools || []);
      },

      getAllComponents: () => {
        const enabledPlugins = get().getEnabledPlugins();
        return enabledPlugins.flatMap((p) => p.components || []);
      },

      getAllModes: () => {
        const enabledPlugins = get().getEnabledPlugins();
        return enabledPlugins.flatMap((p) => p.modes || []);
      },

      getAllCommands: () => {
        const enabledPlugins = get().getEnabledPlugins();
        return enabledPlugins.flatMap((p) => p.commands || []);
      },

      // =====================================================================
      // Event System
      // =====================================================================

      addEventListener: (type, listener) => {
        const listeners = get().eventListeners;
        if (!listeners.has(type)) {
          listeners.set(type, new Set());
        }
        listeners.get(type)!.add(listener);

        // Return unsubscribe function
        return () => {
          const typeListeners = listeners.get(type);
          if (typeListeners) {
            typeListeners.delete(listener);
          }
        };
      },

      emitEvent: (event) => {
        const listeners = get().eventListeners;

        // Emit to specific type listeners
        const typeListeners = listeners.get(event.type);
        if (typeListeners) {
          typeListeners.forEach((listener) => listener(event));
        }

        // Emit to wildcard listeners
        const wildcardListeners = listeners.get('*');
        if (wildcardListeners) {
          wildcardListeners.forEach((listener) => listener(event));
        }
      },

      // =====================================================================
      // Reset
      // =====================================================================

      reset: () => {
        set({
          ...initialState,
          eventListeners: new Map(),
        });
      },
    }),
    {
      name: 'cognia-plugins',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // v0 -> v1: Ensure pluginDirectory field exists
          if (!state.pluginDirectory) {
            state.pluginDirectory = null;
          }
          if (!state.plugins || typeof state.plugins !== 'object') {
            state.plugins = {};
          }
        }
        return state;
      },
      partialize: (state) => ({
        // Only persist essential plugin state
        plugins: Object.fromEntries(
          Object.entries(state.plugins).map(([id, plugin]) => [
            id,
            {
              manifest: plugin.manifest,
              status: plugin.status === 'enabled' ? 'installed' : plugin.status,
              source: plugin.source,
              path: plugin.path,
              config: plugin.config,
              installedAt: plugin.installedAt,
              updatedAt: plugin.updatedAt,
            },
          ])
        ),
        pluginDirectory: state.pluginDirectory,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PluginState> | undefined;
        return {
          ...currentState,
          ...persisted,
          // Ensure non-serializable fields are always proper types after hydration
          loading: new Set<string>(),
          eventListeners: new Map<string, Set<(event: PluginSystemEvent) => void>>(),
          // Merge plugins from persisted state, keeping current state's runtime fields
          plugins: {
            ...currentState.plugins,
            ...(persisted?.plugins || {}),
          },
        };
      },
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectPlugin = (pluginId: string) => (state: PluginState) => state.plugins[pluginId];

export const selectEnabledPlugins = (state: PluginState) =>
  Object.values(state.plugins).filter((p) => p.status === 'enabled');

export const selectPluginsByStatus = (status: PluginStatus) => (state: PluginState) =>
  Object.values(state.plugins).filter((p) => p.status === status);

export const selectPluginConfig = (pluginId: string) => (state: PluginState) =>
  state.plugins[pluginId]?.config;

export const selectAllPluginTools = (state: PluginState) =>
  Object.values(state.plugins)
    .filter((p) => p.status === 'enabled')
    .flatMap((p) => p.tools || []);

export const selectAllPluginComponents = (state: PluginState) =>
  Object.values(state.plugins)
    .filter((p) => p.status === 'enabled')
    .flatMap((p) => p.components || []);

export const selectAllPluginModes = (state: PluginState) =>
  Object.values(state.plugins)
    .filter((p) => p.status === 'enabled')
    .flatMap((p) => p.modes || []);
