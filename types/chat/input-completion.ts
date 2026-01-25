/**
 * Input Completion Type Definitions
 *
 * Unified type system for multiple completion providers:
 * - @mention (MCP tools, resources, prompts)
 * - /slash commands
 * - :emoji picker
 * - AI ghost text completion
 */

import type { ReactNode } from 'react';
import type { MentionItem } from '@/types/mcp';

/** Completion provider types */
export type CompletionProviderType =
  | 'mention' // MCP @mentions
  | 'ai-text' // AI ghost text completion
  | 'slash' // Slash commands
  | 'emoji' // Emoji picker
  | 'quick-insert'; // Quick insert templates

/** Trigger types */
export type TriggerType =
  | 'symbol' // Single character: @ / :
  | 'prefix' // Word prefix: cmd/
  | 'contextual' // Based on context
  | 'manual'; // Explicit trigger (Ctrl+Space)

/** Base completion item */
export interface CompletionItem {
  id: string;
  type: CompletionProviderType;
  label: string;
  description?: string;
  icon?: ReactNode;
  metadata?: Record<string, unknown>;
}

/** Mention completion item */
export interface MentionCompletionItem extends CompletionItem {
  type: 'mention';
  data: MentionItem;
}

/** Slash command completion item */
export interface SlashCommandCompletionItem extends CompletionItem {
  type: 'slash';
  command: string;
  category: SlashCommandCategory;
  params?: CommandParameter[];
}

/** Emoji completion item */
export interface EmojiCompletionItem extends CompletionItem {
  type: 'emoji';
  emoji: string;
  category: string;
  keywords: string[];
}

/** Quick insert completion item */
export interface QuickInsertCompletionItem extends CompletionItem {
  type: 'quick-insert';
  template: string;
  category: string;
}

/** AI text completion result */
export interface AITextCompletionResult {
  text: string;
  confidence: number;
  cursorOffset: number;
}

/** Unified completion state */
export interface UnifiedCompletionState {
  isOpen: boolean;
  activeProvider: CompletionProviderType | null;
  trigger: string | null;
  query: string;
  triggerPosition: number;
  items: CompletionItem[];
  selectedIndex: number;
  ghostText: string | null;
}

/** Completion provider config */
export interface CompletionProviderConfig {
  type: CompletionProviderType;
  trigger: TriggerType;
  triggerChar?: string;
  priority: number;
  enabled: boolean;
  debounceMs?: number;
}

/** Command parameter definition */
export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  description?: string;
  enumValues?: string[];
  defaultValue?: unknown;
}

/** Slash command categories */
export type SlashCommandCategory = 'chat' | 'agent' | 'media' | 'system' | 'navigation' | 'custom';

/** Slash command definition */
export interface SlashCommand {
  id: string;
  command: string;
  description: string;
  icon?: ReactNode;
  category: SlashCommandCategory;
  params?: CommandParameter[];
  handler: (params: Record<string, string>) => void | Promise<void>;
  aliases?: string[];
  hidden?: boolean;
}

/** Emoji data structure */
export interface EmojiData {
  emoji: string;
  name: string;
  keywords: string[];
  category: EmojiCategory;
}

/** Emoji categories */
export type EmojiCategory =
  | 'smileys'
  | 'people'
  | 'animals'
  | 'food'
  | 'activities'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';

/** Completion settings stored in settings store */
export interface CompletionSettings {
  // Provider settings
  mentionEnabled: boolean;
  slashCommandsEnabled: boolean;
  emojiEnabled: boolean;
  aiCompletionEnabled: boolean;

  // AI completion settings
  aiCompletionProvider: 'ollama' | 'openai' | 'groq' | 'auto';
  aiCompletionDebounce: number;
  aiCompletionMaxTokens: number;

  // Trigger settings
  slashTriggerChar: string;
  emojiTriggerChar: string;

  // UI settings
  showInlinePreview: boolean;
  ghostTextOpacity: number;
  autoDismissDelay: number;
  maxSuggestions: number;
}

/** Default completion settings */
export const DEFAULT_COMPLETION_SETTINGS: CompletionSettings = {
  mentionEnabled: true,
  slashCommandsEnabled: true,
  emojiEnabled: true,
  aiCompletionEnabled: false,

  aiCompletionProvider: 'auto',
  aiCompletionDebounce: 400,
  aiCompletionMaxTokens: 50,

  slashTriggerChar: '/',
  emojiTriggerChar: ':',

  showInlinePreview: true,
  ghostTextOpacity: 0.5,
  autoDismissDelay: 5000,
  maxSuggestions: 10,
};

/** Completion event types */
export type CompletionEventType =
  | 'trigger'
  | 'select'
  | 'dismiss'
  | 'accept-ghost'
  | 'reject-ghost';

/** Completion event payload */
export interface CompletionEvent {
  type: CompletionEventType;
  provider: CompletionProviderType;
  item?: CompletionItem;
  text?: string;
  timestamp: number;
}

/** Completion context for AI suggestions */
export interface CompletionContext {
  input: string;
  cursorPosition: number;
  previousMessages?: string[];
  currentMode?: string;
}

/** Platform capabilities for completion */
export interface PlatformCapabilities {
  isDesktop: boolean;
  hasNativeCompletion: boolean;
  hasKeyboardHooks: boolean;
  platform: 'windows' | 'macos' | 'linux' | 'web';
}
