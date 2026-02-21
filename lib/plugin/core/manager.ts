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
  PluginCommand,
  PluginPermission,
  PluginActivationEvent,
  PluginManifestCommandDef,
  PluginTool,
  PluginToolContext,
} from '@/types/plugin';
import { PluginLoader } from '@/lib/plugin/core/loader';
import { PluginRegistry } from '@/lib/plugin/core/registry';
import { createFullPluginContext } from '@/lib/plugin/core/context';
import { createPluginA2UIBridge, type PluginA2UIBridge } from '@/lib/plugin/bridge/a2ui-bridge';
import { PluginLifecycleHooks, getPluginLifecycleHooks } from '@/lib/plugin/messaging/hooks-system';
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

interface RuntimePluginState {
  manifest: PluginManifest;
  status: Plugin['status'];
  path: string;
  config?: Record<string, unknown>;
}

interface RuntimePluginSnapshotEntry {
  plugin: RuntimePluginState;
  grantedPermissions?: string[];
}

type PluginActivationRuntimeEvent =
  | 'startup'
  | `onCommand:${string}`
  | `onTool:${string}`;

interface ParsedActivationSpec {
  startup: boolean;
  commandEvents: string[];
  toolEvents: string[];
  rawEvents: PluginActivationEvent[];
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
  private registeredSlashCommandsByPlugin: Map<string, string[]> = new Map();
  private activationInFlight: Set<string> = new Set();
  private warnedActivationEvents: Set<string> = new Set();
  private initialized = false;

  constructor(config: PluginManagerConfig) {
    this.config = config;
    this.loader = new PluginLoader();
    this.registry = new PluginRegistry();
    this.hooksManager = getPluginLifecycleHooks();
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

    // Sync persisted runtime status from backend when available.
    await this.syncRuntimeState();

    // Restore plugin runtime state from persisted config and activation rules.
    await this.restorePluginStates();

    // Trigger startup lazy activation.
    await this.handleActivationEvent('startup');

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
      if (plugin.status === 'installed' && (this.config.autoEnable || this.shouldActivateOnStartup(plugin.manifest))) {
        try {
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

    if (this.loader.isLoaded(pluginId) && (plugin.status === 'loaded' || plugin.status === 'enabled')) {
      return;
    }

    try {
      if (!(await this.verifyPluginSignature(plugin.path, pluginId))) {
        throw new Error(`Signature verification failed for plugin ${pluginId}`);
      }

      this.registerPluginPermissions(pluginId, plugin.manifest.permissions || []);

      // Load the plugin module
      const definition = await this.loader.load(plugin);
      definition.activation = this.parseActivationSpec(plugin.manifest);

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

      if (plugin.manifest.type !== 'frontend') {
        await this.loadPythonPlugin(pluginId);
      }

      // Update store status
      await store.loadPlugin(pluginId, { viaManager: false });
      await this.syncBackendStatus(pluginId, 'loaded');
      await this.hooksManager.dispatchOnLoad(pluginId);
    } catch (error) {
      store.setPluginError(pluginId, String(error));
      throw error;
    }
  }

  async enablePlugin(pluginId: string, reason: string = 'manual'): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.status === 'enabled') {
      return;
    }

    // Load first when not currently active in runtime.
    if (plugin.status === 'installed' || plugin.status === 'disabled' || !this.loader.isLoaded(pluginId)) {
      await this.loadPlugin(pluginId);
    }

    // Enable the plugin
    await store.enablePlugin(pluginId, { viaManager: false });

    // Register plugin contributions
    await this.registerPluginContributions(pluginId);

    await this.syncBackendStatus(pluginId, 'enabled');
    loggers.manager.debug(`[plugin:${pluginId}] enabled (${reason})`);
  }

  async disablePlugin(pluginId: string, reason: string = 'manual'): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.status !== 'enabled') {
      return;
    }

    try {
      // Fully deactivate runtime resources for deterministic cleanup.
      await this.deactivatePluginRuntime(pluginId, { unloadModule: true });

      // Unregister contributions after runtime deactivation.
      await this.unregisterPluginContributions(pluginId);

      // Disable in store
      await store.disablePlugin(pluginId, { viaManager: false });

      this.hooksManager.unregisterHooks(pluginId);
      this.contexts.delete(pluginId);

      await this.revokePluginPermissions(pluginId, plugin.manifest.permissions || []);
      await this.syncBackendStatus(pluginId, 'disabled');
      loggers.manager.debug(`[plugin:${pluginId}] disabled (${reason})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.setPluginError(pluginId, message);
      loggers.manager.error(`[plugin:${pluginId}] disable failed (${reason})`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) {
      return;
    }

    try {
      // Disable first if enabled
      if (plugin.status === 'enabled') {
        await this.disablePlugin(pluginId, 'unload');
      } else {
        await this.deactivatePluginRuntime(pluginId, { unloadModule: true });
        await this.unregisterPluginContributions(pluginId);
      }

      // Unregister hooks
      this.hooksManager.unregisterHooks(pluginId);

      // Remove context
      this.contexts.delete(pluginId);

      // Unload from loader
      this.loader.unload(pluginId);

      // Update store
      await store.unloadPlugin(pluginId, { viaManager: false });
      await this.syncBackendStatus(pluginId, 'installed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.setPluginError(pluginId, message);
      loggers.manager.error(`[plugin:${pluginId}] unload failed`, error);
      throw error;
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const store = usePluginStore.getState();
    const plugin = store.plugins[pluginId];

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    try {
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
      await store.uninstallPlugin(pluginId, { skipFileRemoval: true, viaManager: false });

      await this.revokePluginPermissions(pluginId, plugin.manifest.permissions || []);
      getPermissionGuard().unregisterPlugin(pluginId);
      this.registeredSlashCommandsByPlugin.delete(pluginId);
      this.activationInFlight.delete(pluginId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.setPluginError(pluginId, message);
      loggers.manager.error(`[plugin:${pluginId}] uninstall failed`, error);
      throw error;
    }
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

  private parseActivationSpec(manifest: PluginManifest): ParsedActivationSpec {
    const rawEvents = (manifest.activationEvents || []).filter(
      (event): event is PluginActivationEvent => typeof event === 'string'
    );

    const startup = Boolean(
      manifest.activateOnStartup ||
      rawEvents.includes('startup') ||
      rawEvents.includes('onStartup')
    );

    const commandEvents = rawEvents
      .filter((event) => event.startsWith('onCommand:'))
      .map((event) => event.slice('onCommand:'.length))
      .filter(Boolean);

    const toolEvents = rawEvents
      .filter((event) => event.startsWith('onTool:') || event.startsWith('onAgentTool:'))
      .map((event) => event.startsWith('onTool:') ? event.slice('onTool:'.length) : event.slice('onAgentTool:'.length))
      .filter(Boolean);

    for (const event of rawEvents) {
      const supported =
        event === 'startup' ||
        event === 'onStartup' ||
        event.startsWith('onCommand:') ||
        event.startsWith('onTool:') ||
        event.startsWith('onAgentTool:');
      if (!supported) {
        const warningKey = `${manifest.id}:${event}`;
        if (!this.warnedActivationEvents.has(warningKey)) {
          this.warnedActivationEvents.add(warningKey);
          loggers.manager.warn(
            `[plugin:${manifest.id}] unsupported activation event "${event}" will be ignored`
          );
        }
      }
    }

    return {
      startup,
      commandEvents,
      toolEvents,
      rawEvents,
    };
  }

  private shouldActivateOnStartup(manifest: PluginManifest): boolean {
    return this.parseActivationSpec(manifest).startup;
  }

  private matchesActivation(eventPattern: string, value: string): boolean {
    const normalizedPattern = eventPattern.trim().toLowerCase();
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedPattern === '*') return true;
    if (!normalizedPattern.includes('*')) {
      return normalizedPattern === normalizedValue;
    }

    const escaped = normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wildcardPattern = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${wildcardPattern}$`).test(normalizedValue);
  }

  private shouldActivateForEvent(manifest: PluginManifest, event: PluginActivationRuntimeEvent): boolean {
    const spec = this.parseActivationSpec(manifest);

    if (event === 'startup') {
      return spec.startup;
    }

    if (event.startsWith('onCommand:')) {
      const command = event.slice('onCommand:'.length);
      return spec.commandEvents.some((pattern) => this.matchesActivation(pattern, command));
    }

    const tool = event.slice('onTool:'.length);
    return spec.toolEvents.some((pattern) => this.matchesActivation(pattern, tool));
  }

  async handleActivationEvent(event: PluginActivationRuntimeEvent): Promise<void> {
    const store = usePluginStore.getState();
    const plugins = Object.values(store.plugins);

    for (const plugin of plugins) {
      if (plugin.status === 'enabled') {
        continue;
      }

      if (!this.shouldActivateForEvent(plugin.manifest, event)) {
        continue;
      }

      if (this.activationInFlight.has(plugin.manifest.id)) {
        continue;
      }

      this.activationInFlight.add(plugin.manifest.id);
      try {
        await this.enablePlugin(plugin.manifest.id, `activation:${event}`);
      } catch (error) {
        loggers.manager.warn(
          `[plugin:${plugin.manifest.id}] activation failed for event "${event}":`,
          error
        );
      } finally {
        this.activationInFlight.delete(plugin.manifest.id);
      }
    }
  }

  async syncRuntimeState(): Promise<void> {
    const store = usePluginStore.getState();

    try {
      const runtimeSnapshot = await invoke<RuntimePluginSnapshotEntry[]>('plugin_runtime_snapshot');
      for (const entry of runtimeSnapshot) {
        const runtime = entry.plugin;
        const existing = store.plugins[runtime.manifest.id];
        if (!existing) {
          store.discoverPlugin(runtime.manifest, 'local', runtime.path);
          await store.installPlugin(runtime.manifest.id);
        }

        if (runtime.status) {
          store.setPluginStatus(runtime.manifest.id, runtime.status);
        }

        if (runtime.config && typeof runtime.config === 'object') {
          store.setPluginConfig(runtime.manifest.id, runtime.config);
        }

        const permissionUnion = new Set<PluginPermission>(runtime.manifest.permissions || []);
        for (const permission of entry.grantedPermissions || []) {
          permissionUnion.add(permission as PluginPermission);
        }
        this.registerPluginPermissions(runtime.manifest.id, Array.from(permissionUnion));
      }
      return;
    } catch {
      // Fall back to legacy endpoint.
    }

    try {
      const runtimePlugins = await invoke<RuntimePluginState[]>('plugin_get_all');
      for (const runtime of runtimePlugins) {
        const existing = store.plugins[runtime.manifest.id];
        if (!existing) {
          store.discoverPlugin(runtime.manifest, 'local', runtime.path);
          await store.installPlugin(runtime.manifest.id);
        }

        if (runtime.status) {
          store.setPluginStatus(runtime.manifest.id, runtime.status);
        }

        if (runtime.config && typeof runtime.config === 'object') {
          store.setPluginConfig(runtime.manifest.id, runtime.config);
        }

        this.registerPluginPermissions(runtime.manifest.id, runtime.manifest.permissions || []);
      }
    } catch (error) {
      // Non-fatal in web mode or when backend command is unavailable.
      loggers.manager.debug('Runtime state sync skipped:', error);
    }
  }

  private async syncBackendStatus(
    pluginId: string,
    status: 'installed' | 'loaded' | 'enabled' | 'disabled' | 'error'
  ): Promise<void> {
    try {
      await invoke('plugin_set_state', { pluginId, status });
    } catch {
      // Best effort: backend may be unavailable in web mode.
    }
  }

  private async revokePluginPermissions(pluginId: string, permissions: PluginPermission[]): Promise<void> {
    const guard = getPermissionGuard();
    if (typeof (guard as { revokeAll?: (id: string) => void }).revokeAll === 'function') {
      (guard as { revokeAll: (id: string) => void }).revokeAll(pluginId);
    } else {
      guard.unregisterPlugin(pluginId);
      guard.registerPlugin(pluginId, []);
    }

    const permissionSet = new Set<string>(permissions);
    try {
      const granted = await invoke<string[]>('plugin_permission_list', { pluginId });
      for (const permission of granted) {
        permissionSet.add(permission);
      }
    } catch {
      // Ignore when backend permission list is unavailable.
    }

    for (const permission of permissionSet) {
      try {
        await invoke('plugin_permission_revoke', {
          request: {
            plugin_id: pluginId,
            permission,
          },
        });
      } catch {
        // Ignore if backend is unavailable or permission was never granted.
      }
    }
  }

  private async deactivatePluginRuntime(
    pluginId: string,
    options: { unloadModule: boolean }
  ): Promise<void> {
    const plugin = usePluginStore.getState().plugins[pluginId];

    const definition = this.loader.getDefinition(pluginId);
    if (definition?.deactivate) {
      await Promise.resolve(definition.deactivate());
    }

    if (plugin && plugin.manifest.type !== 'frontend') {
      try {
        await this.unloadPythonPlugin(pluginId);
      } catch {
        // Ignore if python runtime is unavailable.
      }
    }

    if (options.unloadModule) {
      this.loader.unload(pluginId);
    }
  }

  private toRuntimePluginCommand(
    pluginId: string,
    manifestCommand: PluginManifestCommandDef
  ): PluginCommand {
    const namespacedId = `${pluginId}.${manifestCommand.id}`;
    return {
      id: namespacedId,
      name: manifestCommand.name,
      description: manifestCommand.description,
      icon: manifestCommand.icon,
      execute: async () => {
        await this.hooksManager.dispatchOnCommand(manifestCommand.id, []);
      },
    };
  }

  private async registerPluginSlashCommand(
    pluginId: string,
    manifestCommand: PluginManifestCommandDef,
    namespacedId: string
  ): Promise<void> {
    const commandName = manifestCommand.id.toLowerCase();
    const registrationList = this.registeredSlashCommandsByPlugin.get(pluginId) || [];

    try {
      const { getCommand, registerCommand } = await import('@/lib/chat/slash-command-registry');
      if (getCommand(commandName)) {
        loggers.manager.warn(
          `[plugin:${pluginId}] slash command conflict "${commandName}" - keeping existing registration`
        );
        this.registeredSlashCommandsByPlugin.set(pluginId, registrationList);
        return;
      }

      const requestedAliases = Array.from(
        new Set(
          (manifestCommand.aliases || [])
            .map((alias) => alias.trim().toLowerCase())
            .filter((alias) => alias.length > 0 && alias !== commandName)
        )
      );
      const acceptedAliases: string[] = [];
      for (const alias of requestedAliases) {
        if (getCommand(alias)) {
          loggers.manager.warn(
            `[plugin:${pluginId}] slash alias conflict "${alias}" - keeping existing registration`
          );
          continue;
        }
        acceptedAliases.push(alias);
      }

      registerCommand({
        id: namespacedId,
        source: 'plugin',
        pluginMeta: {
          source: 'plugin',
          pluginId,
          commandId: manifestCommand.id,
        },
        command: commandName,
        description: manifestCommand.description || manifestCommand.name,
        category: 'custom',
        aliases: acceptedAliases.length > 0 ? acceptedAliases : undefined,
        handler: async (args) => {
          const handled = await this.hooksManager.dispatchOnCommand(
            manifestCommand.id,
            Object.values(args)
          );

          if (handled) {
            return {
              success: true,
              message: `Command handled by plugin: /${commandName}`,
            };
          }

          return {
            success: false,
            message: `Plugin command not handled: /${commandName}`,
          };
        },
      });

      registrationList.push(commandName);
      this.registeredSlashCommandsByPlugin.set(pluginId, registrationList);
    } catch (error) {
      loggers.manager.warn(
        `[plugin:${pluginId}] failed to register slash command "${commandName}":`,
        error
      );
    }
  }

  private async unregisterPluginSlashCommands(pluginId: string): Promise<void> {
    const commands = this.registeredSlashCommandsByPlugin.get(pluginId);
    if (!commands || commands.length === 0) {
      return;
    }

    try {
      const { unregisterCommand } = await import('@/lib/chat/slash-command-registry');
      for (const command of commands) {
        unregisterCommand(command);
      }
    } catch (error) {
      loggers.manager.warn(`[plugin:${pluginId}] failed to unregister slash commands:`, error);
    } finally {
      this.registeredSlashCommandsByPlugin.delete(pluginId);
    }
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
        const mode = {
          id: `${pluginId}:${modeDef.id}`,
          type: 'custom' as const,
          name: modeDef.name,
          description: modeDef.description,
          icon: modeDef.icon,
          systemPrompt: modeDef.systemPrompt,
          tools: modeDef.tools,
          outputFormat: modeDef.outputFormat,
          previewEnabled: modeDef.previewEnabled,
        };
        this.registry.registerMode(pluginId, mode);
        store.registerPluginMode(pluginId, mode);
      }
    }

    // Register manifest command metadata for UI and slash command execution.
    if (plugin.manifest.commands?.length) {
      for (const manifestCommand of plugin.manifest.commands) {
        const command = this.toRuntimePluginCommand(pluginId, manifestCommand);
        this.registry.registerCommand(pluginId, command);
        store.registerPluginCommand(pluginId, command);
        await this.registerPluginSlashCommand(pluginId, manifestCommand, command.id);
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
        this.registry.unregisterTool(tool.name);
        store.unregisterPluginTool(pluginId, tool.name);
      }
    }

    // Unregister all components
    if (plugin.components) {
      for (const component of plugin.components) {
        this.registry.unregisterComponent(component.type);
        store.unregisterPluginComponent(pluginId, component.type);
      }
    }

    // Unregister all modes
    if (plugin.modes) {
      for (const mode of plugin.modes) {
        this.registry.unregisterMode(mode.id);
        store.unregisterPluginMode(pluginId, mode.id);
      }
    }

    // Unregister all commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        this.registry.unregisterCommand(command.id);
        store.unregisterPluginCommand(pluginId, command.id);
      }
    }

    await this.unregisterPluginSlashCommands(pluginId);
    this.registry.unregisterAll(pluginId);
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
        const tool: PluginTool = {
          name: `${pluginId}:${toolDef.name}`,
          pluginId,
          definition: {
            name: toolDef.name,
            description: toolDef.description,
            parametersSchema: toolDef.parameters,
          },
          execute: async (args: Record<string, unknown>, _context: PluginToolContext) => {
            return invoke('plugin_python_call_tool', {
              pluginId,
              toolName: toolDef.name,
              args,
            });
          },
        };
        this.registry.registerTool(pluginId, tool);
        store.registerPluginTool(pluginId, tool);
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
