/**
 * Command Types
 *
 * @description Type definitions for plugin commands.
 * Commands are slash-commands that users can execute from the command palette.
 */

/**
 * Command definition
 *
 * @remarks
 * Commands are slash-commands that users can execute from the command palette.
 *
 * @example
 * ```typescript
 * const command: PluginCommand = {
 *   id: 'my-plugin.do-something',
 *   name: 'Do Something',
 *   description: 'Does something useful',
 *   icon: 'zap',
 *   shortcut: 'Ctrl+Shift+D',
 *   execute: async (args) => {
 *     console.log('Command executed!');
 *   },
 * };
 * ```
 *
 * @see {@link defineCommand} helper for creating commands
 */
export interface PluginCommand {
  /** Command ID (plugin-prefixed) */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Icon */
  icon?: string;

  /** Keyboard shortcut */
  shortcut?: string;

  /** Whether command is enabled */
  enabled?: boolean | (() => boolean);

  /** Execute handler */
  execute: (args?: Record<string, unknown>) => void | Promise<void>;
}
