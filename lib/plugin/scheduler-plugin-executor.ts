/**
 * Scheduler Plugin Executor
 *
 * Provides handler registration and execution for plugin-defined scheduled tasks
 */

import type { PluginTaskHandler } from '@/types/plugin/plugin-scheduler';
import { createLogger } from '@/lib/logger';

const log = createLogger('plugin:scheduler-executor');

// =============================================================================
// Handler Registry
// =============================================================================

/**
 * Registry of plugin task handlers
 * Key format: `${pluginId}:${handlerName}`
 */
const pluginTaskHandlers = new Map<string, PluginTaskHandler>();

/**
 * Register a plugin task handler
 */
export function registerPluginTaskHandler(
  fullName: string,
  handler: PluginTaskHandler
): void {
  pluginTaskHandlers.set(fullName, handler);
  log.info(`Registered plugin task handler: ${fullName}`);
}

/**
 * Unregister a plugin task handler
 */
export function unregisterPluginTaskHandler(fullName: string): void {
  pluginTaskHandlers.delete(fullName);
  log.info(`Unregistered plugin task handler: ${fullName}`);
}

/**
 * Get a plugin task handler by full name
 */
export function getPluginTaskHandler(fullName: string): PluginTaskHandler | undefined {
  return pluginTaskHandlers.get(fullName);
}

/**
 * Check if a plugin task handler is registered
 */
export function hasPluginTaskHandler(fullName: string): boolean {
  return pluginTaskHandlers.has(fullName);
}

/**
 * Get all registered plugin task handler names
 */
export function getPluginTaskHandlerNames(): string[] {
  return Array.from(pluginTaskHandlers.keys());
}

/**
 * Clear all registered handlers (for testing/cleanup)
 */
export function clearPluginTaskHandlers(): void {
  pluginTaskHandlers.clear();
  log.info('Cleared all plugin task handlers');
}
