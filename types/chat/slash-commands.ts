/**
 * Slash Commands Type Definitions
 *
 * Types for the slash command system including:
 * - Command definitions
 * - Parameter parsing
 * - Execution context
 */

import type { ReactNode } from 'react';
import type { SlashCommandCategory, CommandParameter } from './input-completion';

/** Slash command execution context */
export interface SlashCommandContext {
  /** Current input value */
  input: string;
  /** Current session ID */
  sessionId?: string;
  /** Current conversation messages */
  messageCount: number;
  /** Current mode (chat/agent/research) */
  mode: string;
  /** Current model name */
  modelName?: string;
}

/** Parsed slash command from input */
export interface ParsedSlashCommand {
  /** Full matched text including / */
  matchedText: string;
  /** Command name without / */
  command: string;
  /** Start position in input */
  startIndex: number;
  /** End position in input */
  endIndex: number;
  /** Parsed arguments */
  args: Record<string, string>;
  /** Raw argument string */
  rawArgs: string;
}

/** Slash command execution result */
export interface SlashCommandResult {
  success: boolean;
  message?: string;
  /** New input value after command execution */
  newInput?: string;
  /** Whether to clear the input */
  clearInput?: boolean;
  /** Whether to submit the message */
  submit?: boolean;
  /** Data payload for complex commands */
  data?: unknown;
}

/** Slash command handler function */
export type SlashCommandHandler = (
  args: Record<string, string>,
  context: SlashCommandContext
) => SlashCommandResult | Promise<SlashCommandResult>;

export interface PluginSlashCommandAdapterMeta {
  source: 'plugin';
  pluginId: string;
  commandId: string;
}

/** Extended slash command definition with handler */
export interface SlashCommandDefinition {
  id: string;
  command: string;
  description: string;
  source?: 'builtin' | 'plugin' | 'external-agent';
  pluginMeta?: PluginSlashCommandAdapterMeta;
  longDescription?: string;
  icon?: ReactNode;
  category: SlashCommandCategory;
  params?: CommandParameter[];
  handler: SlashCommandHandler;
  aliases?: string[];
  hidden?: boolean;
  /** Minimum permission level required */
  requiresAuth?: boolean;
  /** Whether command can be auto-completed */
  allowAutoComplete?: boolean;
  /** Example usage */
  examples?: string[];
}

/** Slash command group for display */
export interface SlashCommandGroup {
  category: SlashCommandCategory;
  label: string;
  commands: SlashCommandDefinition[];
}

/** Slash command registry state */
export interface SlashCommandRegistryState {
  commands: Map<string, SlashCommandDefinition>;
  aliases: Map<string, string>;
}

/** Category display information */
export const SLASH_COMMAND_CATEGORY_INFO: Record<
  SlashCommandCategory,
  { label: string; icon: string; order: number }
> = {
  chat: { label: 'Chat', icon: 'message-circle', order: 1 },
  agent: { label: 'Agent', icon: 'bot', order: 2 },
  media: { label: 'Media', icon: 'image', order: 3 },
  navigation: { label: 'Navigation', icon: 'compass', order: 4 },
  system: { label: 'System', icon: 'settings', order: 5 },
  custom: { label: 'Custom', icon: 'puzzle', order: 6 },
};
