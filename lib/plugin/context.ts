/**
 * Plugin Context - Runtime context provided to plugins
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Plugin,
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginUIAPI,
  PluginA2UIAPI,
  PluginAgentAPI,
  PluginSettingsAPI,
  PluginPythonAPI,
  PluginNetworkAPI,
  PluginFileSystemAPI,
  PluginClipboardAPI,
  PluginShellAPI,
  PluginDatabaseAPI,
  PluginShortcutsAPI,
  PluginContextMenuAPI,
  PluginWindowAPI,
  PluginSecretsAPI,
  PluginNotification,
  PluginDialog,
  PluginInputDialog,
  PluginConfirmDialog,
  PluginStatusBarItem,
  PluginSidebarPanel,
  PluginTool,
  PluginA2UIComponent,
  A2UITemplateDef,
  NetworkRequestOptions,
  NetworkResponse,
  DownloadOptions,
  DownloadResult,
  UploadOptions,
  FileEntry,
  FileStat,
  FileWatchEvent,
  ShellOptions,
  ShellResult,
  SpawnOptions,
  ChildProcess,
  DatabaseResult,
  DatabaseTransaction,
  TableSchema,
  ShortcutOptions,
  ShortcutRegistration,
  ContextMenuItem,
  ContextMenuClickContext,
  WindowOptions,
  PluginWindow,
} from '@/types/plugin';
import type { A2UIComponent, A2UISurfaceType } from '@/types/artifact/a2ui';
import type { AgentModeConfig } from '@/types/agent/agent-mode';
import { usePluginStore } from '@/stores/plugin';
import { useA2UIStore } from '@/stores/a2ui';
import { useSettingsStore } from '@/stores/settings';
import type { PluginManager } from './manager';
import type { ExtendedPluginContext } from '@/types/plugin/plugin-extended';
import {
  createSessionAPI,
  createProjectAPI,
  createVectorAPI,
  createThemeAPI,
  createExportAPI,
  createI18nAPI,
  createCanvasAPI,
  createArtifactAPI,
  createNotificationCenterAPI,
  createAIProviderAPI,
  createExtensionAPI,
  createPermissionAPI,
} from './api';
import { createIPCAPI } from './ipc';
import { createEventAPI } from './message-bus';
import { getPluginI18nLoader } from './i18n-loader';
import { getPluginDebugger } from './debugger';

/**
 * Full plugin context combining base and extended APIs
 */
export interface FullPluginContext extends PluginContext, ExtendedPluginContext {}

// =============================================================================
// Create Plugin Context
// =============================================================================

export function createPluginContext(
  plugin: Plugin,
  manager: PluginManager,
  options?: { enableDebug?: boolean }
): PluginContext {
  const pluginId = plugin.manifest.id;

  const baseContext: PluginContext = {
    pluginId,
    pluginPath: plugin.path,
    config: plugin.config,
    logger: createLogger(pluginId),
    storage: createStorage(pluginId),
    events: createEventEmitter(pluginId),
    ui: createUIAPI(pluginId),
    a2ui: createA2UIAPI(pluginId, manager),
    agent: createAgentAPI(pluginId, manager),
    settings: createSettingsAPI(pluginId),
    python: plugin.manifest.type !== 'frontend' 
      ? createPythonAPI(pluginId, manager) 
      : undefined,
    network: createNetworkAPI(pluginId),
    fs: createFileSystemAPI(pluginId),
    clipboard: createClipboardAPI(pluginId),
    shell: createShellAPI(pluginId),
    db: createDatabaseAPI(pluginId),
    shortcuts: createShortcutsAPI(pluginId),
    contextMenu: createContextMenuAPI(pluginId),
    window: createWindowAPI(pluginId),
    secrets: createSecretsAPI(pluginId),
  };

  // If debug mode is enabled, wrap the context with debug instrumentation
  if (options?.enableDebug) {
    const debugger_ = getPluginDebugger();
    debugger_.startSession(pluginId);
    return debugger_.createDebugContext(pluginId, baseContext);
  }

  return baseContext;
}

/**
 * Create a full plugin context with all APIs (base + extended)
 */
export function createFullPluginContext(
  plugin: Plugin,
  manager: PluginManager,
  options?: { enableDebug?: boolean }
): FullPluginContext {
  const pluginId = plugin.manifest.id;
  
  // Get the base context (with optional debug mode)
  const baseContext = createPluginContext(plugin, manager, options);
  
  // Create extended APIs
  const extendedContext: ExtendedPluginContext = {
    session: createSessionAPI(pluginId),
    project: createProjectAPI(pluginId),
    vector: createVectorAPI(pluginId),
    theme: createThemeAPI(pluginId),
    export: createExportAPI(pluginId),
    i18n: createI18nAPI(pluginId),
    canvas: createCanvasAPI(pluginId),
    artifact: createArtifactAPI(pluginId),
    notifications: createNotificationCenterAPI(pluginId),
    ai: createAIProviderAPI(pluginId),
    extensions: createExtensionAPI(pluginId),
    permissions: createPermissionAPI(pluginId, plugin.manifest.permissions || []),
  };

  // Add new communication and utility APIs to base context
  const ipcAPI = createIPCAPI(pluginId);
  const eventAPI = createEventAPI(pluginId);
  const i18nLoader = getPluginI18nLoader();
  const pluginI18n = i18nLoader.createPluginAPI(pluginId);

  // Merge IPC and events into the base context events
  const enhancedEvents = {
    ...baseContext.events,
    ipc: ipcAPI,
    bus: eventAPI,
  };

  // Enhanced i18n combining base API with loader
  const enhancedI18n = {
    ...extendedContext.i18n,
    t: pluginI18n.t,
    getLocale: pluginI18n.getLocale,
    hasKey: pluginI18n.hasKey,
    // Wrap onLocaleChange to match PluginI18nAPI signature (Locale instead of string)
    onLocaleChange: (handler: (locale: import('@/types/plugin/plugin-extended').Locale) => void) => 
      pluginI18n.onLocaleChange((locale: string) => handler(locale as import('@/types/plugin/plugin-extended').Locale)),
  };

  // Combine base and extended contexts with enhanced APIs
  return {
    ...baseContext,
    ...extendedContext,
    events: enhancedEvents,
    i18n: enhancedI18n,
  };
}

/**
 * Check if a context is a full plugin context
 */
export function isFullPluginContext(context: PluginContext): context is FullPluginContext {
  return 'session' in context && 'project' in context && 'vector' in context;
}

// =============================================================================
// Logger
// =============================================================================

function createLogger(pluginId: string): PluginLogger {
  const prefix = `[Plugin:${pluginId}]`;

  return {
    debug: (message: string, ...args: unknown[]) => {
      console.debug(prefix, message, ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(prefix, message, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(prefix, message, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(prefix, message, ...args);
    },
  };
}

// =============================================================================
// Storage
// =============================================================================

function createStorage(pluginId: string): PluginStorage {
  const storageKey = `cognia-plugin-storage:${pluginId}`;

  const getStorageData = (): Record<string, unknown> => {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  };

  const setStorageData = (data: Record<string, unknown>): void => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  return {
    get: async <T>(key: string): Promise<T | undefined> => {
      const data = getStorageData();
      return data[key] as T | undefined;
    },

    set: async <T>(key: string, value: T): Promise<void> => {
      const data = getStorageData();
      data[key] = value;
      setStorageData(data);
    },

    delete: async (key: string): Promise<void> => {
      const data = getStorageData();
      delete data[key];
      setStorageData(data);
    },

    keys: async (): Promise<string[]> => {
      const data = getStorageData();
      return Object.keys(data);
    },

    clear: async (): Promise<void> => {
      localStorage.removeItem(storageKey);
    },
  };
}

// =============================================================================
// Event Emitter
// =============================================================================

function createEventEmitter(pluginId: string): PluginEventEmitter {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const eventPrefix = `plugin:${pluginId}:`;

  return {
    on: (event: string, handler: (...args: unknown[]) => void) => {
      const key = eventPrefix + event;
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(handler);

      // Return unsubscribe function
      return () => {
        const eventListeners = listeners.get(key);
        if (eventListeners) {
          eventListeners.delete(handler);
        }
      };
    },

    off: (event: string, handler: (...args: unknown[]) => void) => {
      const key = eventPrefix + event;
      const eventListeners = listeners.get(key);
      if (eventListeners) {
        eventListeners.delete(handler);
      }
    },

    emit: (event: string, ...args: unknown[]) => {
      const key = eventPrefix + event;
      const eventListeners = listeners.get(key);
      if (eventListeners) {
        eventListeners.forEach((handler) => {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in plugin event handler for ${event}:`, error);
          }
        });
      }
    },

    once: (event: string, handler: (...args: unknown[]) => void) => {
      const wrappedHandler = (...args: unknown[]) => {
        handler(...args);
        const key = eventPrefix + event;
        listeners.get(key)?.delete(wrappedHandler);
      };

      const key = eventPrefix + event;
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(wrappedHandler);

      return () => {
        listeners.get(key)?.delete(wrappedHandler);
      };
    },
  };
}

// =============================================================================
// UI API
// =============================================================================

function createUIAPI(_pluginId: string): PluginUIAPI {
  // Status bar items registry
  const statusBarItems = new Map<string, PluginStatusBarItem>();
  // Sidebar panels registry
  const sidebarPanels = new Map<string, PluginSidebarPanel>();

  return {
    showNotification: async (options: PluginNotification) => {
      try {
        await invoke('plugin_show_notification', {
          title: options.title,
          body: options.body,
          icon: options.icon,
        });
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    },

    showToast: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      // This would integrate with a toast system
      // For now, use console
      const methods = {
        info: console.info,
        success: console.log,
        warning: console.warn,
        error: console.error,
      };
      methods[type](`[Toast] ${message}`);
    },

    showDialog: async (options: PluginDialog): Promise<unknown> => {
      // This would show a custom dialog
      // For now, return a promise that resolves with the first action
      console.log('Dialog:', options.title, options.content);
      return options.actions?.[0]?.value;
    },

    showInputDialog: async (options: PluginInputDialog): Promise<string | null> => {
      // Use browser prompt as fallback
      const result = window.prompt(
        `${options.title}\n${options.message || ''}`,
        options.defaultValue
      );
      
      if (result !== null && options.validate) {
        const error = options.validate(result);
        if (error) {
          console.error('Validation error:', error);
          return null;
        }
      }
      
      return result;
    },

    showConfirmDialog: async (options: PluginConfirmDialog): Promise<boolean> => {
      // Use browser confirm as fallback
      return window.confirm(`${options.title}\n\n${options.message}`);
    },

    registerStatusBarItem: (item: PluginStatusBarItem) => {
      statusBarItems.set(item.id, item);
      // Would emit event to update status bar UI
      return () => {
        statusBarItems.delete(item.id);
      };
    },

    registerSidebarPanel: (panel: PluginSidebarPanel) => {
      sidebarPanels.set(panel.id, panel);
      // Would emit event to update sidebar UI
      return () => {
        sidebarPanels.delete(panel.id);
      };
    },
  };
}

// =============================================================================
// A2UI API
// =============================================================================

function createA2UIAPI(pluginId: string, manager: PluginManager): PluginA2UIAPI {
  const a2uiStore = useA2UIStore.getState();

  return {
    createSurface: (id: string, type: A2UISurfaceType, options?: { title?: string }) => {
      a2uiStore.createSurface(id, type, options);
    },

    deleteSurface: (id: string) => {
      a2uiStore.deleteSurface(id);
    },

    updateComponents: (surfaceId: string, components: A2UIComponent[]) => {
      a2uiStore.processMessage({
        type: 'updateComponents',
        surfaceId,
        components,
      });
    },

    updateDataModel: (surfaceId: string, data: Record<string, unknown>, merge = true) => {
      a2uiStore.processMessage({
        type: 'dataModelUpdate',
        surfaceId,
        data,
        merge,
      });
    },

    getSurface: (id: string) => {
      return a2uiStore.getSurface(id);
    },

    registerComponent: (component: PluginA2UIComponent) => {
      manager.getRegistry().registerComponent(pluginId, component);
      usePluginStore.getState().registerPluginComponent(pluginId, component);
    },

    registerTemplate: (template: A2UITemplateDef) => {
      manager.getRegistry().registerTemplate(pluginId, template);
    },
  };
}

// =============================================================================
// Agent API
// =============================================================================

function createAgentAPI(pluginId: string, manager: PluginManager): PluginAgentAPI {
  return {
    registerTool: (tool: PluginTool) => {
      manager.getRegistry().registerTool(pluginId, tool);
      usePluginStore.getState().registerPluginTool(pluginId, tool);
    },

    unregisterTool: (name: string) => {
      manager.getRegistry().unregisterTool(name);
      usePluginStore.getState().unregisterPluginTool(pluginId, name);
    },

    registerMode: (mode: AgentModeConfig) => {
      const prefixedMode = {
        ...mode,
        id: `${pluginId}:${mode.id}`,
      };
      manager.getRegistry().registerMode(pluginId, prefixedMode);
      usePluginStore.getState().registerPluginMode(pluginId, prefixedMode);
    },

    unregisterMode: (id: string) => {
      const prefixedId = `${pluginId}:${id}`;
      manager.getRegistry().unregisterMode(prefixedId);
      usePluginStore.getState().unregisterPluginMode(pluginId, prefixedId);
    },

    executeAgent: async (config: Record<string, unknown>) => {
      // Would integrate with agent execution system
      return invoke('agent_execute', { config });
    },

    cancelAgent: (agentId: string) => {
      // Would integrate with agent execution system
      invoke('agent_cancel', { agentId }).catch(console.error);
    },
  };
}

// =============================================================================
// Settings API
// =============================================================================

function createSettingsAPI(pluginId: string): PluginSettingsAPI {
  const settingsKey = `plugin:${pluginId}`;
  const listeners = new Map<string, Set<(value: unknown) => void>>();

  return {
    get: <T>(key: string): T | undefined => {
      const state = useSettingsStore.getState();
      const pluginSettings = (state as unknown as Record<string, unknown>)[settingsKey] as Record<string, unknown> | undefined;
      return pluginSettings?.[key] as T | undefined;
    },

    set: <T>(key: string, value: T) => {
      // This would integrate with settings store
      console.log(`Plugin ${pluginId} setting ${key}:`, value);
      
      // Notify listeners
      const keyListeners = listeners.get(key);
      if (keyListeners) {
        keyListeners.forEach((listener) => listener(value));
      }
    },

    onChange: (key: string, handler: (value: unknown) => void) => {
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(handler);

      return () => {
        listeners.get(key)?.delete(handler);
      };
    },
  };
}

// =============================================================================
// Python API
// =============================================================================

function createPythonAPI(pluginId: string, _manager: PluginManager): PluginPythonAPI {
  return {
    call: async <T>(functionName: string, ...args: unknown[]): Promise<T> => {
      return invoke<T>('plugin_python_call', {
        pluginId,
        functionName,
        args,
      });
    },

    eval: async <T>(code: string, locals?: Record<string, unknown>): Promise<T> => {
      return invoke<T>('plugin_python_eval', {
        pluginId,
        code,
        locals: locals || {},
      });
    },

    import: async (moduleName: string) => {
      await invoke('plugin_python_import', {
        pluginId,
        moduleName,
      });

      return {
        call: async <T>(functionName: string, ...args: unknown[]): Promise<T> => {
          return invoke<T>('plugin_python_module_call', {
            pluginId,
            moduleName,
            functionName,
            args,
          });
        },

        getattr: async <T>(name: string): Promise<T> => {
          return invoke<T>('plugin_python_module_getattr', {
            pluginId,
            moduleName,
            attrName: name,
          });
        },
      };
    },
  };
}

// =============================================================================
// Network API
// =============================================================================

function createNetworkAPI(pluginId: string): PluginNetworkAPI {
  const makeRequest = async <T>(
    url: string,
    options?: NetworkRequestOptions
  ): Promise<NetworkResponse<T>> => {
    return invoke<NetworkResponse<T>>('plugin_network_fetch', {
      pluginId,
      url,
      options: options || {},
    });
  };

  return {
    get: <T>(url: string, options?: NetworkRequestOptions) =>
      makeRequest<T>(url, { ...options, method: 'GET' }),

    post: <T>(url: string, body?: unknown, options?: NetworkRequestOptions) =>
      makeRequest<T>(url, { ...options, method: 'POST', body }),

    put: <T>(url: string, body?: unknown, options?: NetworkRequestOptions) =>
      makeRequest<T>(url, { ...options, method: 'PUT', body }),

    delete: <T>(url: string, options?: NetworkRequestOptions) =>
      makeRequest<T>(url, { ...options, method: 'DELETE' }),

    patch: <T>(url: string, body?: unknown, options?: NetworkRequestOptions) =>
      makeRequest<T>(url, { ...options, method: 'PATCH', body }),

    fetch: makeRequest,

    download: async (url: string, destPath: string, _options?: DownloadOptions): Promise<DownloadResult> => {
      return invoke<DownloadResult>('plugin_network_download', {
        pluginId,
        url,
        destPath,
      });
    },

    upload: async (url: string, filePath: string, _options?: UploadOptions): Promise<NetworkResponse<unknown>> => {
      return invoke<NetworkResponse<unknown>>('plugin_network_upload', {
        pluginId,
        url,
        filePath,
      });
    },
  };
}

// =============================================================================
// File System API
// =============================================================================

function createFileSystemAPI(pluginId: string): PluginFileSystemAPI {
  const dataDir = `~/.cognia/plugins/${pluginId}/data`;
  const cacheDir = `~/.cognia/plugins/${pluginId}/cache`;
  const tempDir = `~/.cognia/temp`;

  return {
    readText: (path: string) =>
      invoke<string>('plugin_fs_read_text', { pluginId, path }),

    readBinary: (path: string) =>
      invoke<Uint8Array>('plugin_fs_read_binary', { pluginId, path }),

    readJson: <T>(path: string) =>
      invoke<T>('plugin_fs_read_json', { pluginId, path }),

    writeText: (path: string, content: string) =>
      invoke<void>('plugin_fs_write_text', { pluginId, path, content }),

    writeBinary: (path: string, content: Uint8Array) =>
      invoke<void>('plugin_fs_write_binary', { pluginId, path, content: Array.from(content) }),

    writeJson: (path: string, data: unknown, pretty = true) =>
      invoke<void>('plugin_fs_write_json', { pluginId, path, data, pretty }),

    appendText: (path: string, content: string) =>
      invoke<void>('plugin_fs_append_text', { pluginId, path, content }),

    exists: (path: string) =>
      invoke<boolean>('plugin_fs_exists', { pluginId, path }),

    mkdir: (path: string, recursive = true) =>
      invoke<void>('plugin_fs_mkdir', { pluginId, path, recursive }),

    remove: (path: string, recursive = false) =>
      invoke<void>('plugin_fs_remove', { pluginId, path, recursive }),

    copy: (src: string, dest: string) =>
      invoke<void>('plugin_fs_copy', { pluginId, src, dest }),

    move: (src: string, dest: string) =>
      invoke<void>('plugin_fs_move', { pluginId, src, dest }),

    readDir: (path: string) =>
      invoke<FileEntry[]>('plugin_fs_read_dir', { pluginId, path }),

    stat: (path: string) =>
      invoke<FileStat>('plugin_fs_stat', { pluginId, path }),

    watch: (path: string, callback: (event: FileWatchEvent) => void) => {
      const watchId = `${pluginId}:${path}:${Date.now()}`;
      invoke('plugin_fs_watch', { pluginId, path, watchId }).catch(console.error);
      
      const handler = (event: CustomEvent<FileWatchEvent>) => {
        if (event.detail.path.startsWith(path)) {
          callback(event.detail);
        }
      };
      
      window.addEventListener(`plugin-fs-watch:${watchId}`, handler as EventListener);
      
      return () => {
        window.removeEventListener(`plugin-fs-watch:${watchId}`, handler as EventListener);
        invoke('plugin_fs_unwatch', { watchId }).catch(console.error);
      };
    },

    getDataDir: () => dataDir,
    getCacheDir: () => cacheDir,
    getTempDir: () => tempDir,
  };
}

// =============================================================================
// Clipboard API
// =============================================================================

function createClipboardAPI(_pluginId: string): PluginClipboardAPI {
  return {
    readText: () => invoke<string>('plugin_clipboard_read_text'),
    writeText: (text: string) => invoke<void>('plugin_clipboard_write_text', { text }),
    readImage: () => invoke<Uint8Array | null>('plugin_clipboard_read_image'),
    writeImage: (data: Uint8Array, format?: 'png' | 'jpeg') =>
      invoke<void>('plugin_clipboard_write_image', { data: Array.from(data), format }),
    hasText: () => invoke<boolean>('plugin_clipboard_has_text'),
    hasImage: () => invoke<boolean>('plugin_clipboard_has_image'),
    clear: () => invoke<void>('plugin_clipboard_clear'),
  };
}

// =============================================================================
// Shell API
// =============================================================================

function createShellAPI(pluginId: string): PluginShellAPI {
  return {
    execute: (command: string, options?: ShellOptions) =>
      invoke<ShellResult>('plugin_shell_execute', { pluginId, command, options }),

    spawn: (command: string, args?: string[], options?: SpawnOptions): ChildProcess => {
      const processId = `${pluginId}:${Date.now()}`;
      
      invoke('plugin_shell_spawn', { pluginId, processId, command, args, options })
        .catch(console.error);

      return {
        pid: 0,
        stdin: new WritableStream(),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
        kill: (signal?: string) => {
          invoke('plugin_process_kill', { processId, signal }).catch(console.error);
        },
        onExit: (callback: (code: number) => void) => {
          window.addEventListener(`plugin-process-exit:${processId}`, ((e: CustomEvent) => {
            callback(e.detail.code);
          }) as EventListener);
        },
      };
    },

    open: (path: string) => invoke<void>('plugin_shell_open', { path }),
    showInFolder: (path: string) => invoke<void>('plugin_shell_show_in_folder', { path }),
  };
}

// =============================================================================
// Database API
// =============================================================================

function createDatabaseAPI(pluginId: string): PluginDatabaseAPI {
  return {
    query: <T>(sql: string, params?: unknown[]) =>
      invoke<T[]>('plugin_db_query', { pluginId, sql, params }),

    execute: (sql: string, params?: unknown[]) =>
      invoke<DatabaseResult>('plugin_db_execute', { pluginId, sql, params }),

    transaction: async <T>(fn: (tx: DatabaseTransaction) => Promise<T>): Promise<T> => {
      const txId = `${pluginId}:${Date.now()}`;
      await invoke('plugin_db_begin_transaction', { pluginId, txId });
      
      try {
        const tx: DatabaseTransaction = {
          query: <R>(sql: string, params?: unknown[]) =>
            invoke<R[]>('plugin_db_tx_query', { txId, sql, params }),
          execute: (sql: string, params?: unknown[]) =>
            invoke<DatabaseResult>('plugin_db_tx_execute', { txId, sql, params }),
        };
        
        const result = await fn(tx);
        await invoke('plugin_db_commit', { txId });
        return result;
      } catch (error) {
        await invoke('plugin_db_rollback', { txId });
        throw error;
      }
    },

    createTable: (name: string, schema: TableSchema) =>
      invoke<void>('plugin_db_create_table', { pluginId, name, schema }),

    dropTable: (name: string) =>
      invoke<void>('plugin_db_drop_table', { pluginId, name }),

    tableExists: (name: string) =>
      invoke<boolean>('plugin_db_table_exists', { pluginId, name }),
  };
}

// =============================================================================
// Shortcuts API
// =============================================================================

function createShortcutsAPI(pluginId: string): PluginShortcutsAPI {
  const registeredShortcuts = new Set<string>();

  return {
    register: (shortcut: string, callback: () => void, options?: ShortcutOptions) => {
      const id = `${pluginId}:${shortcut}`;
      registeredShortcuts.add(shortcut);
      
      invoke('plugin_shortcut_register', { pluginId, shortcut, options })
        .catch(console.error);

      const handler = () => callback();
      window.addEventListener(`plugin-shortcut:${id}`, handler);

      return () => {
        registeredShortcuts.delete(shortcut);
        window.removeEventListener(`plugin-shortcut:${id}`, handler);
        invoke('plugin_shortcut_unregister', { pluginId, shortcut }).catch(console.error);
      };
    },

    registerMany: (shortcuts: ShortcutRegistration[]) => {
      const unsubscribes = shortcuts.map(({ shortcut, callback, options }) =>
        createShortcutsAPI(pluginId).register(shortcut, callback, options)
      );

      return () => unsubscribes.forEach((unsub) => unsub());
    },

    isAvailable: (shortcut: string) => !registeredShortcuts.has(shortcut),
    getRegistered: () => Array.from(registeredShortcuts),
  };
}

// =============================================================================
// Context Menu API
// =============================================================================

function createContextMenuAPI(pluginId: string): PluginContextMenuAPI {
  const handlers = new Map<string, (context: ContextMenuClickContext) => void>();

  return {
    register: (item: ContextMenuItem) => {
      const id = `${pluginId}:${item.id}`;
      handlers.set(id, item.onClick);

      invoke('plugin_context_menu_register', {
        pluginId,
        item: { ...item, id },
      }).catch(console.error);

      const handler = ((e: CustomEvent<ContextMenuClickContext>) => {
        item.onClick(e.detail);
      }) as EventListener;
      
      window.addEventListener(`plugin-context-menu:${id}`, handler);

      return () => {
        handlers.delete(id);
        window.removeEventListener(`plugin-context-menu:${id}`, handler);
        invoke('plugin_context_menu_unregister', { pluginId, itemId: id })
          .catch(console.error);
      };
    },

    registerMany: (items: ContextMenuItem[]) => {
      const unsubscribes = items.map((item) =>
        createContextMenuAPI(pluginId).register(item)
      );

      return () => unsubscribes.forEach((unsub) => unsub());
    },
  };
}

// =============================================================================
// Window API
// =============================================================================

function createWindowAPI(pluginId: string): PluginWindowAPI {
  const windows = new Map<string, PluginWindow>();

  const createPluginWindow = (id: string, title: string): PluginWindow => ({
    id,
    title,
    setTitle: (newTitle: string) => {
      invoke('plugin_window_set_title', { windowId: id, title: newTitle })
        .catch(console.error);
    },
    close: () => invoke<void>('plugin_window_close', { windowId: id }),
    minimize: () => invoke<void>('plugin_window_minimize', { windowId: id }),
    maximize: () => invoke<void>('plugin_window_maximize', { windowId: id }),
    unmaximize: () => invoke<void>('plugin_window_unmaximize', { windowId: id }),
    isMaximized: () => false, // Would need async check
    setSize: (width: number, height: number) =>
      invoke<void>('plugin_window_set_size', { windowId: id, width, height }),
    getSize: () => ({ width: 800, height: 600 }), // Would need async check
    setPosition: (x: number, y: number) =>
      invoke<void>('plugin_window_set_position', { windowId: id, x, y }),
    getPosition: () => ({ x: 0, y: 0 }), // Would need async check
    center: () => invoke<void>('plugin_window_center', { windowId: id }),
    setAlwaysOnTop: (flag: boolean) =>
      invoke<void>('plugin_window_set_always_on_top', { windowId: id, flag }),
    show: () => invoke<void>('plugin_window_show', { windowId: id }),
    hide: () => invoke<void>('plugin_window_hide', { windowId: id }),
    onClose: (callback: () => void) => {
      const handler = () => callback();
      window.addEventListener(`plugin-window-close:${id}`, handler);
      return () => window.removeEventListener(`plugin-window-close:${id}`, handler);
    },
  });

  return {
    create: async (options: WindowOptions): Promise<PluginWindow> => {
      const windowId = await invoke<string>('plugin_window_create', {
        pluginId,
        options,
      });
      const win = createPluginWindow(windowId, options.title);
      windows.set(windowId, win);
      return win;
    },

    getMain: () => createPluginWindow('main', 'Cognia'),
    getAll: () => Array.from(windows.values()),
    focus: (windowId: string) => {
      invoke('plugin_window_focus', { windowId }).catch(console.error);
    },
  };
}

// =============================================================================
// Secrets API
// =============================================================================

function createSecretsAPI(pluginId: string): PluginSecretsAPI {
  return {
    store: (key: string, value: string) =>
      invoke<void>('plugin_secrets_store', { pluginId, key, value }),

    get: (key: string) =>
      invoke<string | null>('plugin_secrets_get', { pluginId, key }),

    delete: (key: string) =>
      invoke<void>('plugin_secrets_delete', { pluginId, key }),

    has: (key: string) =>
      invoke<boolean>('plugin_secrets_has', { pluginId, key }),
  };
}
