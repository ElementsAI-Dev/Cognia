/**
 * Testing Utilities for Plugin Development
 *
 * @description Mock utilities and test helpers for testing plugins.
 * Provides mock contexts, test runners, and assertion helpers.
 */

import type { PluginContext, PluginLogger, PluginStorage, PluginEventEmitter, PluginSettingsAPI } from '../context/base';
import type { PluginToolContext, PluginTool, PluginToolDef } from '../tools/types';
import type { PluginHooks } from '../hooks/base';

/**
 * Mock logger that captures log calls
 */
export interface MockLogger extends PluginLogger {
  /** All captured log entries */
  logs: Array<{ level: string; message: string; args: unknown[] }>;
  /** Clear all logs */
  clear(): void;
  /** Get logs by level */
  getByLevel(level: 'debug' | 'info' | 'warn' | 'error'): Array<{ message: string; args: unknown[] }>;
}

/**
 * Create a mock logger
 */
export function createMockLogger(): MockLogger {
  const logs: Array<{ level: string; message: string; args: unknown[] }> = [];

  return {
    logs,
    debug: (message: string, ...args: unknown[]) => {
      logs.push({ level: 'debug', message, args });
    },
    info: (message: string, ...args: unknown[]) => {
      logs.push({ level: 'info', message, args });
    },
    warn: (message: string, ...args: unknown[]) => {
      logs.push({ level: 'warn', message, args });
    },
    error: (message: string, ...args: unknown[]) => {
      logs.push({ level: 'error', message, args });
    },
    clear: () => {
      logs.length = 0;
    },
    getByLevel: (level) => {
      return logs.filter((l) => l.level === level).map(({ message, args }) => ({ message, args }));
    },
  };
}

/**
 * Mock storage that uses in-memory Map
 */
export interface MockStorage extends PluginStorage {
  /** Internal storage data */
  data: Map<string, unknown>;
  /** Clear all data */
  clear(): Promise<void>;
}

/**
 * Create a mock storage
 */
export function createMockStorage(initialData?: Record<string, unknown>): MockStorage {
  const data = new Map<string, unknown>(Object.entries(initialData || {}));

  return {
    data,
    get: async <T>(key: string): Promise<T | undefined> => {
      return data.get(key) as T | undefined;
    },
    set: async <T>(key: string, value: T): Promise<void> => {
      data.set(key, value);
    },
    delete: async (key: string): Promise<void> => {
      data.delete(key);
    },
    keys: async (): Promise<string[]> => {
      return Array.from(data.keys());
    },
    clear: async (): Promise<void> => {
      data.clear();
    },
  };
}

/**
 * Mock event emitter that captures events
 */
export interface MockEventEmitter extends PluginEventEmitter {
  /** Emitted events */
  emittedEvents: Array<{ event: string; args: unknown[] }>;
  /** Registered handlers */
  handlers: Map<string, Set<(...args: unknown[]) => void>>;
  /** Clear all events and handlers */
  clear(): void;
  /** Get events by name */
  getEvents(event: string): unknown[][];
}

/**
 * Create a mock event emitter
 */
export function createMockEventEmitter(): MockEventEmitter {
  const emittedEvents: Array<{ event: string; args: unknown[] }> = [];
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    emittedEvents,
    handlers,
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
      return () => {
        handlers.get(event)?.delete(handler);
      };
    },
    off: (event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
    },
    emit: (event: string, ...args: unknown[]) => {
      emittedEvents.push({ event, args });
      handlers.get(event)?.forEach((h) => h(...args));
    },
    once: (event: string, handler: (...args: unknown[]) => void) => {
      const wrappedHandler = (...args: unknown[]) => {
        handler(...args);
        handlers.get(event)?.delete(wrappedHandler);
      };
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(wrappedHandler);
      return () => {
        handlers.get(event)?.delete(wrappedHandler);
      };
    },
    clear: () => {
      emittedEvents.length = 0;
      handlers.clear();
    },
    getEvents: (event: string) => {
      return emittedEvents.filter((e) => e.event === event).map((e) => e.args);
    },
  };
}

/**
 * Mock settings API
 */
export function createMockSettings(initialSettings?: Record<string, unknown>): PluginSettingsAPI {
  const settings = new Map<string, unknown>(Object.entries(initialSettings || {}));
  const listeners = new Map<string, Set<(value: unknown) => void>>();

  return {
    get: <T>(key: string): T | undefined => {
      return settings.get(key) as T | undefined;
    },
    set: <T>(key: string, value: T) => {
      settings.set(key, value);
      listeners.get(key)?.forEach((h) => h(value));
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

/**
 * Options for creating mock context
 */
export interface MockContextOptions {
  /** Plugin ID */
  pluginId?: string;
  /** Plugin path */
  pluginPath?: string;
  /** Plugin config */
  config?: Record<string, unknown>;
  /** Initial storage data */
  storageData?: Record<string, unknown>;
  /** Initial settings */
  settings?: Record<string, unknown>;
  /** Override specific context properties */
  overrides?: Partial<PluginContext>;
}

/**
 * Mock plugin context with all mocked APIs
 */
export interface MockPluginContext extends PluginContext {
  /** Mock logger */
  logger: MockLogger;
  /** Mock storage */
  storage: MockStorage;
  /** Mock event emitter */
  events: MockEventEmitter;
  /** Reset all mocks */
  reset(): void;
}

/**
 * Create a mock plugin context for testing
 *
 * @param options - Context options
 * @returns Mock plugin context
 *
 * @example
 * ```typescript
 * const context = createMockContext({
 *   pluginId: 'test-plugin',
 *   storageData: { key: 'value' },
 * });
 *
 * // Use in tests
 * const result = await myPlugin.activate(context);
 *
 * // Check logs
 * expect(context.logger.logs).toContainEqual({
 *   level: 'info',
 *   message: 'Plugin activated!',
 *   args: [],
 * });
 * ```
 */
export function createMockContext(options: MockContextOptions = {}): MockPluginContext {
  const {
    pluginId = 'test-plugin',
    pluginPath = '/test/plugins/test-plugin',
    config = {},
    storageData = {},
    settings = {},
    overrides = {},
  } = options;

  const logger = createMockLogger();
  const storage = createMockStorage(storageData);
  const events = createMockEventEmitter();
  const settingsApi = createMockSettings(settings);

  // Use type assertion for mock context since mocks are intentionally simplified
  const context = {
    pluginId,
    pluginPath,
    config,
    logger,
    storage,
    events,
    settings: settingsApi,
    ui: createMockUIAPI(),
    a2ui: createMockA2UIAPI(),
    agent: createMockAgentAPI(),
    network: createMockNetworkAPI(),
    fs: createMockFileSystemAPI(),
    clipboard: createMockClipboardAPI(),
    shell: createMockShellAPI(),
    db: createMockDatabaseAPI(),
    shortcuts: createMockShortcutsAPI(),
    contextMenu: createMockContextMenuAPI(),
    window: createMockWindowAPI(),
    secrets: createMockSecretsAPI(),
    reset: () => {
      logger.clear();
      storage.clear();
      events.clear();
    },
    ...overrides,
  } as MockPluginContext;

  return context;
}

/**
 * Create a mock tool context
 */
export function createMockToolContext(overrides: Partial<PluginToolContext> = {}): PluginToolContext {
  return {
    sessionId: 'test-session',
    messageId: 'test-message',
    config: {},
    reportProgress: (_progress: number, _message?: string) => {},
    signal: undefined,
    ...overrides,
  };
}

/**
 * Test a tool definition
 *
 * @param tool - Tool definition to test
 * @param args - Arguments to pass to the tool
 * @param context - Optional tool context overrides
 * @returns Tool execution result
 *
 * @example
 * ```typescript
 * const result = await testTool(myTool, { query: 'test' });
 * expect(result.success).toBe(true);
 * ```
 */
export async function testTool<TArgs extends Record<string, unknown>, TResult = unknown>(
  tool: PluginToolDef & { execute: (args: TArgs, context?: PluginToolContext) => Promise<TResult> },
  args: TArgs,
  context?: Partial<PluginToolContext>
): Promise<TResult> {
  const toolContext = createMockToolContext(context);
  return tool.execute(args, toolContext);
}

/**
 * Test a registered plugin tool
 */
export async function testPluginTool<TResult = unknown>(
  tool: PluginTool,
  args: Record<string, unknown>,
  context?: Partial<PluginToolContext>
): Promise<TResult> {
  const toolContext = createMockToolContext(context);
  return tool.execute(args, toolContext) as Promise<TResult>;
}

/**
 * Test a hook
 *
 * @param hooks - Plugin hooks object
 * @param hookName - Name of hook to test
 * @param args - Arguments to pass to hook
 * @returns Hook result
 *
 * @example
 * ```typescript
 * await testHook(myHooks, 'onAgentStep', 'agent-1', { type: 'thinking' });
 * ```
 */
export async function testHook<K extends keyof PluginHooks>(
  hooks: PluginHooks,
  hookName: K,
  ...args: Parameters<NonNullable<PluginHooks[K]>>
): Promise<ReturnType<NonNullable<PluginHooks[K]>> | void> {
  const hook = hooks[hookName];
  if (!hook) {
    return undefined;
  }
  return (hook as (...a: unknown[]) => unknown)(...args) as ReturnType<NonNullable<PluginHooks[K]>>;
}

/**
 * Create a spy function that tracks calls
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(
  implementation?: T
): T & {
  calls: Array<{ args: Parameters<T>; result: ReturnType<T> }>;
  callCount: number;
  reset: () => void;
  lastCall: { args: Parameters<T>; result: ReturnType<T> } | undefined;
} {
  const calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = [];

  const spy = ((...args: Parameters<T>): ReturnType<T> => {
    const result = implementation ? implementation(...args) : undefined;
    calls.push({ args, result: result as ReturnType<T> });
    return result as ReturnType<T>;
  }) as T & {
    calls: typeof calls;
    callCount: number;
    reset: () => void;
    lastCall: { args: Parameters<T>; result: ReturnType<T> } | undefined;
  };

  Object.defineProperty(spy, 'calls', { get: () => calls });
  Object.defineProperty(spy, 'callCount', { get: () => calls.length });
  Object.defineProperty(spy, 'lastCall', { get: () => calls[calls.length - 1] });
  spy.reset = () => { calls.length = 0; };

  return spy;
}

// =============================================================================
// Mock API Implementations
// =============================================================================

function createMockUIAPI() {
  return {
    showNotification: async () => {},
    showToast: () => {},
    showDialog: async () => undefined,
    showInputDialog: async () => null,
    showConfirmDialog: async () => false,
    registerStatusBarItem: () => () => {},
    registerSidebarPanel: () => () => {},
  };
}

function createMockA2UIAPI() {
  return {
    createSurface: () => {},
    deleteSurface: () => {},
    updateComponents: () => {},
    updateDataModel: () => {},
    getSurface: () => undefined,
    registerComponent: () => {},
    registerTemplate: () => {},
  };
}

function createMockAgentAPI() {
  const tools = new Map<string, PluginTool>();
  return {
    registerTool: (tool: PluginTool) => { tools.set(tool.name, tool); },
    unregisterTool: (name: string) => { tools.delete(name); },
    registerMode: () => {},
    unregisterMode: () => {},
    executeAgent: async () => ({}),
    cancelAgent: () => {},
    // Test helpers
    _tools: tools,
  };
}

function createMockNetworkAPI() {
  return {
    get: async <T>() => ({ data: {} as T, status: 200, ok: true, statusText: 'OK', headers: {} }),
    post: async <T>() => ({ data: {} as T, status: 200, ok: true, statusText: 'OK', headers: {} }),
    put: async <T>() => ({ data: {} as T, status: 200, ok: true, statusText: 'OK', headers: {} }),
    delete: async <T>() => ({ data: {} as T, status: 200, ok: true, statusText: 'OK', headers: {} }),
    patch: async <T>() => ({ data: {} as T, status: 200, ok: true, statusText: 'OK', headers: {} }),
    fetch: async <T>() => ({ data: {} as T, status: 200, ok: true, statusText: 'OK', headers: {} }),
    download: async () => ({ success: true, path: '' }),
    upload: async () => ({ data: {}, status: 200, ok: true, statusText: 'OK', headers: {} }),
  };
}

function createMockFileSystemAPI() {
  return {
    readText: async () => '',
    readBinary: async () => new Uint8Array(),
    readJson: async <T>() => ({} as T),
    writeText: async () => {},
    writeBinary: async () => {},
    writeJson: async () => {},
    appendText: async () => {},
    exists: async () => false,
    mkdir: async () => {},
    remove: async () => {},
    copy: async () => {},
    move: async () => {},
    readDir: async () => [],
    stat: async () => ({ size: 0, isFile: true, isDirectory: false, isSymlink: false, createdAt: new Date(), modifiedAt: new Date() }),
    watch: () => () => {},
    getDataDir: () => '/data',
    getCacheDir: () => '/cache',
    getTempDir: () => '/temp',
  };
}

function createMockClipboardAPI() {
  let text = '';
  return {
    readText: async () => text,
    writeText: async (t: string) => { text = t; },
    readImage: async () => null,
    writeImage: async () => {},
    hasText: async () => text.length > 0,
    hasImage: async () => false,
    clear: async () => { text = ''; },
  };
}

function createMockShellAPI() {
  return {
    execute: async () => ({ stdout: '', stderr: '', exitCode: 0, code: 0, success: true }),
    spawn: () => ({
      pid: 0,
      stdin: new WritableStream(),
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
      kill: () => {},
      onExit: () => {},
    }),
    open: async () => {},
    showInFolder: async () => {},
  };
}

function createMockDatabaseAPI() {
  return {
    query: async <T>() => [] as T[],
    execute: async () => ({ rowsAffected: 0, lastInsertId: 0 }),
    transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({
      query: async <R>() => [] as R[],
      execute: async () => ({ rowsAffected: 0, lastInsertId: 0 }),
    }),
    createTable: async () => {},
    dropTable: async () => {},
    tableExists: async () => false,
  };
}

function createMockShortcutsAPI() {
  return {
    register: () => () => {},
    registerMany: () => () => {},
    isAvailable: () => true,
    getRegistered: () => [],
  };
}

function createMockContextMenuAPI() {
  return {
    register: () => () => {},
    registerMany: () => () => {},
  };
}

function createMockWindowAPI() {
  return {
    create: async () => ({
      id: 'window-1',
      title: 'Test',
      setTitle: () => {},
      close: async () => {},
      minimize: async () => {},
      maximize: async () => {},
      unmaximize: async () => {},
      isMaximized: () => false,
      setSize: async () => {},
      getSize: () => ({ width: 800, height: 600 }),
      setPosition: async () => {},
      getPosition: () => ({ x: 0, y: 0 }),
      center: async () => {},
      setAlwaysOnTop: async () => {},
      show: async () => {},
      hide: async () => {},
      focus: async () => {},
    }),
    getCurrent: () => null,
    getMain: () => null,
    getAll: () => [],
    focus: async () => {},
  };
}

function createMockSecretsAPI() {
  const secrets = new Map<string, string>();
  return {
    get: async (key: string) => secrets.get(key) ?? null,
    store: async (key: string, value: string) => { secrets.set(key, value); },
    delete: async (key: string) => { secrets.delete(key); },
    has: async (key: string) => secrets.has(key),
  };
}
