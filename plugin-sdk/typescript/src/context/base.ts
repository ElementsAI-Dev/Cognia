/**
 * Base Plugin Context
 *
 * @description Core context and API types provided to plugins.
 * The plugin context is the main interface for plugins to interact with the application.
 */

import type { PluginA2UIAPI } from '../a2ui/types';
import type { PluginAgentAPI } from '../tools/types';
import type {
  PluginNetworkAPI,
  PluginFileSystemAPI,
  PluginClipboardAPI,
  PluginShellAPI,
  PluginDatabaseAPI,
  PluginUIAPI,
  PluginShortcutsAPI,
  PluginContextMenuAPI,
  PluginWindowAPI,
  PluginSecretsAPI,
  PluginBrowserAPI,
  PluginSchedulerAPI,
} from '../api';
import type { PluginHostTransport } from '../core';

/**
 * Logger API
 *
 * @remarks
 * Provides logging utilities with different levels.
 *
 * @example
 * ```typescript
 * context.logger.debug('Debug message');
 * context.logger.info('Info message');
 * context.logger.warn('Warning message');
 * context.logger.error('Error message');
 * ```
 */
export interface PluginLogger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  trace?: (message: string, ...args: unknown[]) => void;
  fatal?: (message: string, ...args: unknown[]) => void;
  child?: (scope: string) => PluginLogger;
  withContext?: (context: Record<string, unknown>) => PluginLogger;
}

/**
 * Storage API for persistent key-value storage
 *
 * @remarks
 * Provides persistent storage specific to the plugin. Data is stored
 * in the application's data directory and persists across sessions.
 *
 * @example
 * ```typescript
 * // Store a value
 * await context.storage.set('apiKey', 'sk-...');
 *
 * // Retrieve a value
 * const apiKey = await context.storage.get<string>('apiKey');
 *
 * // Delete a value
 * await context.storage.delete('apiKey');
 *
 * // List all keys
 * const keys = await context.storage.keys();
 * ```
 */
export interface PluginStorage {
  get: <T>(key: string) => Promise<T | undefined>;
  set: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  keys: () => Promise<string[]>;
  clear: () => Promise<void>;
}

/**
 * Event emitter for plugin events
 *
 * @remarks
 * Allows plugins to emit and listen to custom events.
 *
 * @example
 * ```typescript
 * // Listen to events
 * const unsubscribe = context.events.on('my-event', (data) => {
 *   console.log('Event received:', data);
 * });
 *
 * // Emit events
 * context.events.emit('my-event', { foo: 'bar' });
 *
 * // Clean up
 * unsubscribe();
 * ```
 */
export interface PluginEventEmitter {
  on: (event: string, handler: (...args: unknown[]) => void) => () => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
  once: (event: string, handler: (...args: unknown[]) => void) => () => void;
}

/**
 * Settings API for accessing application settings
 *
 * @example
 * ```typescript
 * // Get a setting
 * const theme = context.settings.get<string>('theme');
 *
 * // Set a setting
 * context.settings.set('theme', 'dark');
 *
 * // Listen for changes
 * const unsubscribe = context.settings.onChange('theme', (value) => {
 *   console.log('Theme changed:', value);
 * });
 * ```
 */
export interface PluginSettingsAPI {
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, value: T) => void;
  onChange: (key: string, handler: (value: unknown) => void) => () => void;
}

/**
 * Python API for hybrid plugins
 *
 * @remarks
 * Allows frontend plugins to call Python functions in hybrid plugins.
 *
 * @example
 * ```typescript
 * // Call a Python function
 * const result = await context.python.call<string>('my_function', arg1, arg2);
 *
 * // Evaluate Python code
 * const value = await context.python.eval<number>('x + y', { x: 1, y: 2 });
 *
 * // Import a Python module
 * const math = await context.python.import('math');
 * const sqrt = await math.call<number>('sqrt', 16);
 * ```
 */
export interface PluginPythonAPI {
  call: <T>(functionName: string, ...args: unknown[]) => Promise<T>;
  eval: <T>(code: string, locals?: Record<string, unknown>) => Promise<T>;
  import: (moduleName: string) => Promise<PluginPythonModule>;
}

/**
 * Python module interface
 */
export interface PluginPythonModule {
  call: <T>(functionName: string, ...args: unknown[]) => Promise<T>;
  getattr: <T>(name: string) => Promise<T>;
}

/**
 * Context provided to plugins
 *
 * @remarks
 * The plugin context is the main interface for plugins to interact with
 * the application. It provides access to all APIs and utilities.
 *
 * @example
 * ```typescript
 * function activate(context: PluginContext): PluginHooks {
 *   // Use the context APIs
 *   context.logger.info('Plugin activated!');
 *   const value = await context.storage.get('key');
 *   context.ui.showNotification({ title: 'Hello!', body: 'World' });
 *
 *   return {};
 * }
 * ```
 *
 * @see {@link PluginContextAPI} for additional APIs
 */
export interface PluginContext {
  /** Plugin ID */
  pluginId: string;

  /** Plugin directory path */
  pluginPath: string;

  /** Plugin configuration */
  config: Record<string, unknown>;

  /** Logger */
  logger: PluginLogger;

  /** Storage API */
  storage: PluginStorage;

  /** Event emitter */
  events: PluginEventEmitter;

  /** UI API */
  ui: PluginUIAPI;

  /** A2UI API */
  a2ui: PluginA2UIAPI;

  /** Agent API */
  agent: PluginAgentAPI;

  /** Settings API */
  settings: PluginSettingsAPI;

  /** Python API (if hybrid plugin) */
  python?: PluginPythonAPI;

  /** Network API for HTTP requests */
  network: PluginNetworkAPI;

  /** File System API */
  fs: PluginFileSystemAPI;

  /** Clipboard API */
  clipboard: PluginClipboardAPI;

  /** Shell API for command execution */
  shell: PluginShellAPI;

  /** Database API */
  db: PluginDatabaseAPI;

  /** Keyboard Shortcuts API */
  shortcuts: PluginShortcutsAPI;

  /** Context Menu API */
  contextMenu: PluginContextMenuAPI;

  /** Window API */
  window: PluginWindowAPI;

  /** Secrets API for secure storage */
  secrets: PluginSecretsAPI;

  /** Browser Automation API (optional) */
  browser?: PluginBrowserAPI;

  /** Scheduler API for scheduled tasks */
  scheduler: PluginSchedulerAPI;

  /** Host bridge transport (v2 gateway) */
  host?: PluginHostTransport;
}
