/**
 * Plugin Manager - Core plugin lifecycle management
 * 
 * Handles plugin discovery, loading, enabling, disabling, and unloading.
 * Coordinates with Tauri backend for Python plugin support via PyO3.
 */

import { invoke } from '@tauri-apps/api/core';
import { usePluginStore } from '@/stores/plugin';
import type {
  Plugin,
  PluginManifest,
  PluginSource,
  PluginContext,
  PluginHooks,
  PluginPermission,
} from '@/types/plugin';
import { PluginLoader } from '@/lib/plugin/core/loader';
import { PluginRegistry } from '@/lib/plugin/core/registry';
import { createFullPluginContext } from '@/lib/plugin/core/context';
import { createPluginA2UIBridge, type PluginA2UIBridge } from '@/lib/plugin/bridge/a2ui-bridge';
import { PluginLifecycleHooks } from '@/lib/plugin/messaging/hooks-system';
import { validatePluginManifest } from '@/lib/plugin/core/validation';
import { loggers } from '@/lib/plugin/core/logger';
import { getPluginSignatureVerifier } from '@/lib/plugin/security/signature';
import { getPermissionGuard } from '@/lib/plugin/security/permission-guard';

// =============================================================================
// Types
// =============================================================================

interface PluginManagerConfig {
  pluginDirectory: string;
  enablePython?: boolean;
  pythonPath?: string;
  autoEnable?: boolean;
  sandboxed?: boolean;
}

interface DiscoveredPlugin {
  manifest: PluginManifest;
  path: string;
  source: PluginSource;
}

/** Python runtime information */
export interface PythonRuntimeInfo {
  available: boolean;
  version: string | null;
  plugin_count: number;
  total_calls: number;
  total_execution_time_ms: number;
  failed_calls: number;
}

/** Python plugin information */
export interface PythonPluginInfo {
  plugin_id: string;
  tool_count: number;
  hook_count: number;
}

// =============================================================================
// Plugin Manager Singleton
// =============================================================================

let pluginManagerInstance: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    throw new Error('Plugin manager not initialized. Call initializePluginManager first.');
  }
  return pluginManagerInstance;
}

export async function initializePluginManager(config: PluginManagerConfig): Promise<PluginManager> {
  if (pluginManagerInstance) {
    return pluginManagerInstance;
  }
  
  pluginManagerInstance = new PluginManager(config);
  await pluginManagerInstance.initialize();
  return pluginManagerInstance;
}

// =============================================================================
// Plugin Manager Class
// =============================================================================

export class PluginManager {
  private config: PluginManagerConfig;
  private loader: PluginLoader;
  private registry: PluginRegistry;
  private hooksManager: PluginLifecycleHooks;
  private a2uiBridge: PluginA2UIBridge | null = null;
  private contexts: Map<string, PluginContext> = new Map();
  private initialized = false;

  constructor(config: PluginManagerConfig) {
    this.config = config;
    this.loader = new PluginLoader();
    this.registry = new PluginRegistry();
    this.hooksManager = new PluginLifecycleHooks();
  }

  private ensureA2UIBridge(): PluginA2UIBridge {
    if (!this.a2uiBridge) {
      this.a2uiBridge = createPluginA2UIBridge({
        registry: this.registry,
        hooksManager: this.hooksManager,
        contextResolver: (pluginId: string) => this.contexts.get(pluginId),
      });
    }
    return this.a2uiBridge;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const store = usePluginStore.getState();
    
    // Initialize store with plugin directory
    await store.initialize(this.config.pluginDirectory);

    // Initialize Python runtime if enabled
    if (this.config.enablePython) {
      await this.initializePythonRuntime();
    }

    // Scan for plugins
    await this.scanPlugins();

    // Auto-enable previously enabled plugins
    await this.restorePluginStates();

    this.initialized = true;
  }

  private async initializePythonRuntime(): Promise<void> {
    try {
      await invoke('plugin_python_initialize', {
        pythonPath: this.config.pythonPath,
      });
    } catch (error) {
      loggers.manager.error('Failed to initialize Python runtime:', error);
      // Continue without Python support
    }
  }

  private async restorePluginStates(): Promise<void> {
    const store = usePluginStore.getState();
    const plugins = Object.values(store.plugins);

    for (const plugin of plugins) {
      if (plugin.status === 'installed' && this.config.autoEnable) {
        try {
          await this.loadPlugin(plugin.manifest.id);
          await this.enablePlugin(plugin.manifest.id);
        } catch (error) {
          loggers.manager.error(`Failed to restore plugin ${plugin.manifest.id}:`, error);
        }
      }
    }
  }

  // ===========================================================================
  // Plugin Discovery
  // ===========================================================================

  async scanPlugins(): Promise<DiscoveredPlugin[]> {
    const discovered: DiscoveredPlugin[] = [];
    const store = usePluginStore.getState();

    try {
      // Scan local plugin directory via Tauri
      const localPlugins = await invoke<Array<{
        manifest: PluginManifest;
        path: string;
      }>>('plugin_scan_directory', {
        directory: this.config.pluginDirectory,
      });

      for (const { manifest, path } of localPlugins) {
        // Validate manifest
        const validation = validatePluginManifest(manifest);
        if (!validation.valid) {
          loggers.manager.warn(`Invalid plugin manifest at ${path}:`, validation.errors);
          continue;
        }

        if (!(await this.verifyPluginSignature(path, manifest.id))) {
          loggers.manager.warn(`Signature verification failed for plugin ${manifest.id}`);
          continue;
        }

        // Register with store if not already registered
        if (!store.plugins[manifest.id]) {
          store.discoverPlugin(manifest, 'local', path);
          await store.installPlugin(manifest.id);
        }

        this.registerPluginPermissions(manifest.id, manifest.permissions || []);

        discovered.push({ manifest, path, source: 'local' });
      }
    } catch (error) {
      loggers.manager.error('Failed to scan plugins:', error);
    }

    return discovered;
  }

  // ===========================================================================
  // Plugin Lifecycle
  // ===========================================================================

  async installPlugin(source: string, options?: { 
    type?: 'local' | 'git' | 'marketplace';
    name?: string;
  }): Promise<Plugin> {
    const store = usePluginStore.getState();
    const type = options?.type || 'local';

    try {
      // Install via Tauri backend
      const result = await invoke<{
        manifest: PluginManifest;
        path: string;
      }>('plugin_install', {
        source,
        installType: type,
        pluginDir: this.config.pluginDirectory,
      });

      // Validate manifest
      const validation = validatePluginManifest(result.manifest);
      if (!validation.valid) {
        throw new Error(`Invalid plugin manifest: ${validation.errors.join(', ')}`);
      }

      // Verify signature
      if (!(await this.verifyPluginSignature(result.path, result.manifest.id))) {
        throw new Error(`Signature verification failed for plugin ${result.manifest.id}`);
      }

      // Register with store
      store.discoverPlugin(result.manifest, type as PluginSource, result.path);
      await store.installPlugin(result.manifest.id);

      this.registerPluginPermissions(result.manifest.id, result.manifest.permissions || []);

      return store.plugins[result.manifest.id];
    } catch (error) {
      throw new Error(`Failed to install plugin: ${error}`);
    }
  }

  async loadPlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    try {
      if (!(await this.verifyPluginSignature(plugin.path, pluginId))) {
        throw new Error(`Signature verification failed for plugin ${pluginId}`);
      }

      this.registerPluginPermissions(pluginId, plugin.manifest.permissions || []);

      // Load the plugin module
      const definition = await this.loader.load(plugin);

      // Check if debug mode is enabled for this plugin
      const enableDebug = plugin.config?.debug === true || 
        process.env.NODE_ENV === 'development' && plugin.config?.devMode === true;

      // Create plugin context with optional debug instrumentation
      const context = createFullPluginContext(plugin, this, { enableDebug });
      this.contexts.set(pluginId, context);

      // Activate the plugin
      let hooks: PluginHooks | undefined;
      if (typeof definition.activate === 'function') {
        hooks = await definition.activate(context) || undefined;
      }

      // Register hooks
      if (hooks) {
        store.registerPluginHooks(pluginId, hooks);
        this.hooksManager.registerHooks(pluginId, hooks);
      }

      // Update store status
      await store.loadPlugin(pluginId);
    } catch (error) {
      store.setPluginError(pluginId, String(error));
      throw error;
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Load first if not loaded
    if (plugin.status === 'installed' || plugin.status === 'disabled') {
      if (plugin.status === 'installed') {
        await this.loadPlugin(pluginId);
      }
    }

    // Enable the plugin
    await store.enablePlugin(pluginId);

    // Register plugin contributions
    await this.registerPluginContributions(pluginId);
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    
    // Unregister contributions first
    await this.unregisterPluginContributions(pluginId);

    // Disable in store
    await store.disablePlugin(pluginId);
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();

    // Disable first if enabled
    const plugin = store.plugins[pluginId];
    if (plugin?.status === 'enabled') {
      await this.disablePlugin(pluginId);
    }

    // Unregister hooks
    this.hooksManager.unregisterHooks(pluginId);

    // Remove context
    this.contexts.delete(pluginId);

    // Unload from loader
    this.loader.unload(pluginId);

    // Update store
    await store.unloadPlugin(pluginId);
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Unload first
    if (['loaded', 'enabled', 'disabled'].includes(plugin.status)) {
      await this.unloadPlugin(pluginId);
    }

    // Remove files via Tauri
    await invoke('plugin_uninstall', {
      pluginId,
      pluginPath: plugin.path,
    });

    // Remove from store
    await store.uninstallPlugin(pluginId, { skipFileRemoval: true });

    getPermissionGuard().unregisterPlugin(pluginId);
  }

  private async verifyPluginSignature(pluginPath: string, pluginId: string): Promise<boolean> {
    try {
      const verifier = getPluginSignatureVerifier();
      const config = verifier.getConfig();

      // Skip verification entirely if signatures are not required and untrusted plugins are allowed
      // This is the default configuration - signature backend commands may not be available
      if (!config.requireSignatures && config.allowUntrusted) {
        return true;
      }

      const result = await verifier.verify(pluginPath);
      if (!result.valid) {
        loggers.manager.warn(`Signature verification failed for ${pluginId}:`, result.reason);
      }
      return result.valid;
    } catch (error) {
      // If signature verification fails due to missing backend support,
      // allow loading if signatures are not strictly required
      const verifier = getPluginSignatureVerifier();
      const config = verifier.getConfig();
      if (!config.requireSignatures) {
        loggers.manager.debug(`Signature verification skipped for ${pluginId} (backend unavailable)`);
        return true;
      }
      loggers.manager.warn(`Signature verification error for ${pluginId}:`, error);
      return false;
    }
  }

  private registerPluginPermissions(pluginId: string, permissions: PluginPermission[]): void {
    const guard = getPermissionGuard();
    guard.registerPlugin(pluginId, permissions);
  }

  // ===========================================================================
  // Plugin Contributions
  // ===========================================================================

  private async registerPluginContributions(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];
    const context = this.contexts.get(pluginId);

    if (!plugin || !context) return;

    // Note: Tool implementations are provided by the plugin's activate function
    // through the context.agent.registerTool API

    // Note: A2UI component implementations are provided by the plugin
    // and registered via context.a2ui.registerComponent API

    // Register modes
    if (plugin.manifest.modes) {
      for (const modeDef of plugin.manifest.modes) {
        store.registerPluginMode(pluginId, {
          id: `${pluginId}:${modeDef.id}`,
          type: 'custom',
          name: modeDef.name,
          description: modeDef.description,
          icon: modeDef.icon,
          systemPrompt: modeDef.systemPrompt,
          tools: modeDef.tools,
          outputFormat: modeDef.outputFormat,
          previewEnabled: modeDef.previewEnabled,
        });
      }
    }
  }

  private async unregisterPluginContributions(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) return;

    this.a2uiBridge?.unregisterPluginComponents(pluginId);
    this.a2uiBridge?.unregisterPluginTemplates(pluginId);

    // Unregister all tools
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        store.unregisterPluginTool(pluginId, tool.name);
      }
    }

    // Unregister all components
    if (plugin.components) {
      for (const component of plugin.components) {
        store.unregisterPluginComponent(pluginId, component.type);
      }
    }

    // Unregister all modes
    if (plugin.modes) {
      for (const mode of plugin.modes) {
        store.unregisterPluginMode(pluginId, mode.id);
      }
    }

    // Unregister all commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        store.unregisterPluginCommand(pluginId, command.id);
      }
    }
  }

  // ===========================================================================
  // Python Plugin Support
  // ===========================================================================

  async loadPythonPlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin || plugin.manifest.type === 'frontend') {
      throw new Error(`Plugin ${pluginId} is not a Python plugin`);
    }

    try {
      // Load Python plugin via Tauri/PyO3
      await invoke('plugin_python_load', {
        pluginId,
        pluginPath: plugin.path,
        mainModule: plugin.manifest.pythonMain,
        dependencies: plugin.manifest.pythonDependencies,
      });

      // Get registered tools from Python
      const pythonTools = await invoke<Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }>>('plugin_python_get_tools', { pluginId });

      // Register Python tools
      for (const toolDef of pythonTools) {
        store.registerPluginTool(pluginId, {
          name: `${pluginId}:${toolDef.name}`,
          pluginId,
          definition: {
            name: toolDef.name,
            description: toolDef.description,
            parametersSchema: toolDef.parameters,
          },
          execute: async (args, _context) => {
            return invoke('plugin_python_call_tool', {
              pluginId,
              toolName: toolDef.name,
              args,
            });
          },
        });
      }
    } catch (error) {
      store.setPluginError(pluginId, String(error));
      throw error;
    }
  }

  async callPythonFunction<T>(
    pluginId: string,
    functionName: string,
    args: unknown[]
  ): Promise<T> {
    return invoke<T>('plugin_python_call', {
      pluginId,
      functionName,
      args,
    });
  }

  /**
   * Get Python runtime information
   */
  async getPythonRuntimeInfo(): Promise<PythonRuntimeInfo> {
    return invoke<PythonRuntimeInfo>('plugin_python_runtime_info');
  }

  /**
   * Check if a Python plugin is initialized
   */
  async isPythonPluginInitialized(pluginId: string): Promise<boolean> {
    return invoke<boolean>('plugin_python_is_initialized', { pluginId });
  }

  /**
   * Get Python plugin info (tool/hook counts)
   */
  async getPythonPluginInfo(pluginId: string): Promise<PythonPluginInfo | null> {
    return invoke<PythonPluginInfo | null>('plugin_python_get_info', { pluginId });
  }

  /**
   * Unload a Python plugin
   */
  async unloadPythonPlugin(pluginId: string): Promise<void> {
    return invoke('plugin_python_unload', { pluginId });
  }

  /**
   * List all loaded Python plugins
   */
  async listPythonPlugins(): Promise<string[]> {
    return invoke<string[]>('plugin_python_list');
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  getPlugin(pluginId: string): Plugin | undefined {
    return usePluginStore.getState().plugins[pluginId];
  }

  getPluginContext(pluginId: string): PluginContext | undefined {
    return this.contexts.get(pluginId);
  }

  getRegistry(): PluginRegistry {
    return this.registry;
  }

  getHooksManager(): PluginLifecycleHooks {
    return this.hooksManager;
  }

  getA2UIBridge(): PluginA2UIBridge {
    return this.ensureA2UIBridge();
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
