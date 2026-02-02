/**
 * Plugin System Logger
 *
 * Centralized logging for the plugin system using the unified logger.
 * This module provides backward-compatible API while delegating to @/lib/logger.
 */

import { createLogger, type Logger } from '@/lib/logger';

// Re-export LogLevel for backward compatibility
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
  minLevel?: LogLevel;
}

// Base plugin logger using unified system
const pluginBaseLogger = createLogger('plugin');

/**
 * Create a wrapper that provides the old API while using unified logger
 */
function createLoggerWrapper(logger: Logger) {
  return {
    debug: (message: string, ...args: unknown[]) => {
      const data = args.length > 0 ? { args } : undefined;
      logger.debug(message, data);
    },
    info: (message: string, ...args: unknown[]) => {
      const data = args.length > 0 ? { args } : undefined;
      logger.info(message, data);
    },
    warn: (message: string, ...args: unknown[]) => {
      const data = args.length > 0 ? { args } : undefined;
      logger.warn(message, data);
    },
    error: (message: string, ...args: unknown[]) => {
      const firstArg = args[0];
      if (firstArg instanceof Error) {
        const data = args.length > 1 ? { args: args.slice(1) } : undefined;
        logger.error(message, firstArg, data);
      } else {
        const data = args.length > 0 ? { args } : undefined;
        logger.error(message, undefined, data);
      }
    },
  };
}

/**
 * Create a logger instance for a specific plugin module
 * @deprecated Use createLogger from @/lib/logger directly for new code
 */
export function createPluginSystemLogger(module: string, _options?: LoggerOptions) {
  const childLogger = pluginBaseLogger.child(module);
  return createLoggerWrapper(childLogger);
}

/**
 * Default plugin system logger
 */
export const pluginLogger = createPluginSystemLogger('system');

/**
 * Module-specific loggers - all using unified logger system
 */
export const loggers = {
  manager: createPluginSystemLogger('manager'),
  loader: createPluginSystemLogger('loader'),
  registry: createPluginSystemLogger('registry'),
  sandbox: createPluginSystemLogger('sandbox'),
  hooks: createPluginSystemLogger('hooks'),
  marketplace: createPluginSystemLogger('marketplace'),
  hotReload: createPluginSystemLogger('hotReload'),
  devServer: createPluginSystemLogger('devServer'),
  ipc: createPluginSystemLogger('ipc'),
  backup: createPluginSystemLogger('backup'),
  updater: createPluginSystemLogger('updater'),
  validation: createPluginSystemLogger('validation'),
  a2ui: createPluginSystemLogger('a2ui'),
  debugger: createPluginSystemLogger('debugger'),
  messageBus: createPluginSystemLogger('messageBus'),
  agent: createPluginSystemLogger('agent'),
  i18n: createPluginSystemLogger('i18n'),
  rollback: createPluginSystemLogger('rollback'),
  signature: createPluginSystemLogger('signature'),
  workflow: createPluginSystemLogger('workflow'),
  devTools: createPluginSystemLogger('devTools'),
};

export type PluginSystemLogger = ReturnType<typeof createPluginSystemLogger>;
