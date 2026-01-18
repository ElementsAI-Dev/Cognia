/**
 * Plugin Definition Helpers
 *
 * @description Helper functions for defining plugins, tools, and commands.
 */

import type { PluginContext } from '../context/base';
import type { ExtendedPluginHooks } from '../hooks/extended';
import type { PluginToolDef, PluginToolContext } from '../tools/types';
import type { PluginCommand } from '../commands/types';

/**
 * Plugin definition interface
 *
 * @remarks
 * Defines the structure for plugin activation/deactivation logic.
 *
 * @example
 * ```typescript
 * const plugin: PluginDefinition = {
 *   activate: (context) => {
 *     context.logger.info('Plugin activated!');
 *     return {
 *       onAgentStep: (id, step) => {},
 *     };
 *   },
 *   deactivate: () => {
 *     console.log('Plugin deactivated');
 *   },
 * };
 *
 * export default definePlugin(plugin);
 * ```
 */
export interface PluginDefinition {
  /**
   * Plugin activation - called when plugin is enabled
   *
   * @param context - The plugin context with all APIs
   * @returns Hooks to register, or void if no hooks
   */
  activate: (context: PluginContext) =>
    Promise<ExtendedPluginHooks | void> |
    ExtendedPluginHooks |
    void;

  /**
   * Plugin deactivation - called when plugin is disabled
   */
  deactivate?: () => Promise<void> | void;
}

/**
 * Helper to create a properly typed plugin
 *
 * @remarks
 * This helper ensures type safety for your plugin definition.
 *
 * @example
 * ```typescript
 * export default definePlugin({
 *   activate(context: PluginContext) {
 *     context.logger.info('Hello from plugin!');
 *
 *     return {
 *       onAgentStep: (agentId, step) => {
 *         context.logger.debug(`Step: ${step.type}`);
 *       },
 *     };
 *   },
 * });
 * ```
 */
export function definePlugin(definition: PluginDefinition): PluginDefinition {
  return definition;
}

/**
 * Helper to create a tool definition
 *
 * @remarks
 * Creates a properly typed tool with schema validation.
 *
 * @example
 * ```typescript
 * const webSearchTool = defineTool(
 *   'web_search',
 *   'Search the web for information',
 *   parameters({
 *     query: Schema.string('Search query'),
 *     limit: Schema.optional(Schema.integer('Max results', { maximum: 100 })),
 *   }, ['query']),
 *   async (args, context) => {
 *     const { query, limit = 10 } = args as { query: string; limit?: number };
 *     // Perform search...
 *     return { results: [] };
 *   },
 *   {
 *     category: 'search',
 *     requiresApproval: false,
 *   }
 * );
 * ```
 */
export function defineTool(
  name: string,
  description: string,
  parametersSchema: Record<string, unknown>,
  execute: (args: Record<string, unknown>, context: PluginToolContext) => Promise<unknown>,
  options?: {
    requiresApproval?: boolean;
    category?: string;
  }
): PluginToolDef & { execute: typeof execute } {
  return {
    name,
    description,
    parametersSchema,
    requiresApproval: options?.requiresApproval,
    category: options?.category,
    execute,
  };
}

/**
 * Helper to create a command definition
 *
 * @remarks
 * Creates a properly typed command for the command palette.
 *
 * @example
 * ```typescript
 * const myCommand = defineCommand(
 *   'my-plugin.do-something',
 *   'Do Something',
 *   async (args) => {
 *     console.log('Command executed!');
 *   },
 *   {
 *     description: 'Does something useful',
 *     icon: 'zap',
 *     shortcut: 'Ctrl+Shift+D',
 *   }
 * );
 * ```
 */
export function defineCommand(
  id: string,
  name: string,
  execute: (args?: Record<string, unknown>) => void | Promise<void>,
  options?: {
    description?: string;
    icon?: string;
    shortcut?: string;
    enabled?: boolean | (() => boolean);
  }
): PluginCommand {
  return {
    id,
    name,
    execute,
    ...options,
  };
}
