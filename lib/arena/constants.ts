/**
 * Arena constants - shared constant values used across arena components
 */

import type { ArenaWinReason } from '@/types/arena';
import type { TaskCategory } from '@/types/provider/auto-router';
import type { ProviderName } from '@/types/provider';

/**
 * All available win reasons for arena voting
 */
export const WIN_REASONS: ArenaWinReason[] = [
  'quality',
  'accuracy',
  'clarity',
  'speed',
  'completeness',
  'creativity',
  'conciseness',
  'other',
];

/**
 * Category IDs for leaderboard tabs
 */
export const CATEGORY_IDS: Array<TaskCategory | 'all'> = [
  'all',
  'coding',
  'math',
  'analysis',
  'creative',
  'research',
  'translation',
];

/**
 * Known model presets for arena battles.
 * Single source of truth — used by multi-model-selector, use-arena, etc.
 */
export interface ArenaModelPresetEntry {
  provider: ProviderName;
  model: string;
  displayName: string;
}

export const ARENA_KNOWN_MODELS: ArenaModelPresetEntry[] = [
  { provider: 'openai', model: 'o3', displayName: 'o3' },
  { provider: 'openai', model: 'gpt-4.1', displayName: 'GPT-4.1' },
  { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4' },
  { provider: 'anthropic', model: 'claude-opus-4-20250514', displayName: 'Claude Opus 4' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku' },
  { provider: 'google', model: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
  { provider: 'google', model: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
  { provider: 'google', model: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  { provider: 'deepseek', model: 'deepseek-chat', displayName: 'DeepSeek V3' },
  { provider: 'deepseek', model: 'deepseek-reasoner', displayName: 'DeepSeek R1' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B' },
  { provider: 'mistral', model: 'mistral-large-latest', displayName: 'Mistral Large' },
  { provider: 'xai', model: 'grok-3', displayName: 'Grok 3' },
];
