/**
 * Preset types - saved chat configurations
 */

import type { ChatMode } from './session';
import type { ProviderName } from './provider';

export interface BuiltinPrompt {
  id: string;
  name: string;
  content: string;
  description?: string;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;

  // Chat configuration
  provider: ProviderName | 'auto';
  model: string;
  mode: ChatMode;

  // Generation settings
  systemPrompt?: string;
  builtinPrompts?: BuiltinPrompt[];
  temperature?: number;
  maxTokens?: number;

  // Feature toggles
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;

  // Metadata
  isDefault?: boolean;
  isBuiltin?: boolean;
  isFavorite?: boolean;
  sortOrder?: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

export interface CreatePresetInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  provider: ProviderName | 'auto';
  model: string;
  mode?: ChatMode;
  systemPrompt?: string;
  builtinPrompts?: BuiltinPrompt[];
  temperature?: number;
  maxTokens?: number;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  isDefault?: boolean;
}

export interface UpdatePresetInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  provider?: ProviderName | 'auto';
  model?: string;
  mode?: ChatMode;
  systemPrompt?: string;
  builtinPrompts?: BuiltinPrompt[];
  temperature?: number;
  maxTokens?: number;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  isDefault?: boolean;
}

// Preset colors for UI
export const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
];

// Preset icons (emoji-based)
export const PRESET_ICONS = [
  '💬', // chat
  '🤖', // robot
  '✨', // sparkles
  '🎯', // target
  '🔮', // crystal ball
  '💡', // idea
  '📝', // memo
  '🎨', // art
  '💻', // laptop
  '🔬', // microscope
  '📊', // chart
  '🎓', // graduation cap
  '🌟', // star
  '🚀', // rocket
  '⚡', // lightning
  '🔥', // fire
];

// Built-in preset templates
export const DEFAULT_PRESETS: Omit<Preset, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  {
    name: 'General Assistant',
    description: 'Balanced general-purpose assistant',
    icon: '💬',
    color: '#6366f1',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt: 'You are a helpful, harmless, and honest assistant.',
    temperature: 0.7,
    isDefault: true,
  },
  {
    name: 'Creative Writer',
    description: 'For creative writing and storytelling',
    icon: '✨',
    color: '#a855f7',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt: 'You are a creative writing assistant. Help the user craft compelling stories, poems, and creative content. Be imaginative, use vivid language, and help develop interesting characters and plots.',
    temperature: 0.9,
  },
  {
    name: 'Code Expert',
    description: 'Technical coding assistant',
    icon: '💻',
    color: '#22c55e',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    mode: 'chat',
    systemPrompt: 'You are an expert programmer. Help the user write clean, efficient, and well-documented code. Explain your reasoning and suggest best practices. When providing code, include comments and handle edge cases.',
    temperature: 0.3,
  },
  {
    name: 'Deep Thinker',
    description: 'For complex reasoning and analysis',
    icon: '🔮',
    color: '#0ea5e9',
    provider: 'openai',
    model: 'o1',
    mode: 'agent',
    systemPrompt: 'You are an expert at complex reasoning and analysis. Break down problems systematically, consider multiple perspectives, and provide well-reasoned conclusions.',
    temperature: 0.5,
    thinkingEnabled: true,
  },
  {
    name: 'Quick Helper',
    description: 'Fast responses for simple tasks',
    icon: '⚡',
    color: '#f59e0b',
    provider: 'openai',
    model: 'gpt-4o-mini',
    mode: 'chat',
    temperature: 0.5,
  },
  {
    name: 'Researcher',
    description: 'For deep research and fact-finding',
    icon: '🔬',
    color: '#14b8a6',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'research',
    systemPrompt: 'You are a research assistant. Help the user find accurate information, cite sources when possible, and provide comprehensive analysis of topics.',
    temperature: 0.4,
    webSearchEnabled: true,
  },
  {
    name: 'Learning Tutor',
    description: 'Interactive learning and tutoring',
    icon: '🎓',
    color: '#8b5cf6',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'learning',
    systemPrompt: 'You are an expert tutor. Help the user learn new concepts by breaking them down into understandable pieces, asking clarifying questions, providing examples, and testing understanding with practice problems.',
    temperature: 0.6,
  },
];
