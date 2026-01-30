/**
 * Plugin System Logger
 *
 * Centralized logging for the plugin system with configurable log levels
 * and environment-aware output. In production, only warnings and errors are logged.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
  minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = process.env.NODE_ENV === 'development';

/**
 * Create a logger instance for a specific module
 */
export function createPluginSystemLogger(module: string, options?: LoggerOptions) {
  const prefix = options?.prefix ?? `[Plugin:${module}]`;
  const enabled = options?.enabled ?? true;
  const minLevel = options?.minLevel ?? (isDev ? 'debug' : 'warn');
  const minLevelValue = LOG_LEVELS[minLevel];

  const shouldLog = (level: LogLevel): boolean => {
    if (!enabled) return false;
    return LOG_LEVELS[level] >= minLevelValue;
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.debug(prefix, message, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info')) {
        console.info(prefix, message, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(prefix, message, ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(prefix, message, ...args);
      }
    },
  };
}

/**
 * Default plugin system logger
 */
export const pluginLogger = createPluginSystemLogger('System');

/**
 * Module-specific loggers
 */
export const loggers = {
  manager: createPluginSystemLogger('Manager'),
  loader: createPluginSystemLogger('Loader'),
  registry: createPluginSystemLogger('Registry'),
  sandbox: createPluginSystemLogger('Sandbox'),
  hooks: createPluginSystemLogger('Hooks'),
  marketplace: createPluginSystemLogger('Marketplace'),
  hotReload: createPluginSystemLogger('HotReload'),
  devServer: createPluginSystemLogger('DevServer'),
  ipc: createPluginSystemLogger('IPC'),
  backup: createPluginSystemLogger('Backup'),
  updater: createPluginSystemLogger('Updater'),
  validation: createPluginSystemLogger('Validation'),
  a2ui: createPluginSystemLogger('A2UI'),
  debugger: createPluginSystemLogger('Debugger'),
  messageBus: createPluginSystemLogger('MessageBus'),
  agent: createPluginSystemLogger('Agent'),
  i18n: createPluginSystemLogger('I18n'),
  rollback: createPluginSystemLogger('Rollback'),
  signature: createPluginSystemLogger('Signature'),
  workflow: createPluginSystemLogger('Workflow'),
  devTools: createPluginSystemLogger('DevTools'),
};

export type PluginSystemLogger = ReturnType<typeof createPluginSystemLogger>;
