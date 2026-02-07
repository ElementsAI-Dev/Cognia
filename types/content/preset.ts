/**
 * Preset types - saved chat configurations
 */

import type { ChatMode } from '../core/session';
import type { ProviderName } from '../provider/provider';

export type PresetCategory =
  | 'general'
  | 'coding'
  | 'writing'
  | 'research'
  | 'education'
  | 'business'
  | 'creative'
  | 'productivity';

export const PRESET_CATEGORIES: PresetCategory[] = [
  'general',
  'coding',
  'writing',
  'research',
  'education',
  'business',
  'creative',
  'productivity',
];

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

  // Organization
  category?: PresetCategory;

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
  category?: PresetCategory;
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
  category?: PresetCategory;
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
    isBuiltin: true,
    category: 'general',
  },
  {
    name: 'Creative Writer',
    description: 'For creative writing and storytelling',
    icon: '✨',
    color: '#a855f7',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt:
      'You are a creative writing assistant. Help the user craft compelling stories, poems, and creative content. Be imaginative, use vivid language, and help develop interesting characters and plots.',
    temperature: 0.9,
    isBuiltin: true,
    category: 'creative',
  },
  {
    name: 'Code Expert',
    description: 'Technical coding assistant',
    icon: '💻',
    color: '#22c55e',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    mode: 'chat',
    systemPrompt:
      'You are an expert programmer. Help the user write clean, efficient, and well-documented code. Explain your reasoning and suggest best practices. When providing code, include comments and handle edge cases.',
    temperature: 0.3,
    isBuiltin: true,
    category: 'coding',
  },
  {
    name: 'Deep Thinker',
    description: 'For complex reasoning and analysis',
    icon: '🔮',
    color: '#0ea5e9',
    provider: 'openai',
    model: 'o1',
    mode: 'agent',
    systemPrompt:
      'You are an expert at complex reasoning and analysis. Break down problems systematically, consider multiple perspectives, and provide well-reasoned conclusions.',
    temperature: 0.5,
    thinkingEnabled: true,
    isBuiltin: true,
    category: 'general',
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
    isBuiltin: true,
    category: 'productivity',
  },
  {
    name: 'Researcher',
    description: 'For deep research and fact-finding',
    icon: '🔬',
    color: '#14b8a6',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'research',
    systemPrompt:
      'You are a research assistant. Help the user find accurate information, cite sources when possible, and provide comprehensive analysis of topics.',
    temperature: 0.4,
    webSearchEnabled: true,
    isBuiltin: true,
    category: 'research',
  },
  {
    name: 'Learning Tutor',
    description: 'Interactive learning and tutoring',
    icon: '🎓',
    color: '#8b5cf6',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'learning',
    systemPrompt:
      'You are an expert tutor. Help the user learn new concepts by breaking them down into understandable pieces, asking clarifying questions, providing examples, and testing understanding with practice problems.',
    temperature: 0.6,
    isBuiltin: true,
    category: 'education',
  },
  {
    name: 'Translator',
    description: 'Multilingual translation expert',
    icon: '🌟',
    color: '#06b6d4',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt:
      'You are a professional translator. Translate text between languages accurately, preserving tone, nuance, and cultural context. When the source language is ambiguous, ask for clarification. Provide alternative translations for idiomatic expressions. Always maintain the original formatting.',
    temperature: 0.3,
    isBuiltin: true,
    category: 'productivity',
  },
  {
    name: 'Data Analyst',
    description: 'Data analysis and visualization expert',
    icon: '📊',
    color: '#3b82f6',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt:
      'You are a data analysis expert. Help the user analyze data, identify patterns and trends, create visualizations, and derive actionable insights. Use statistical methods when appropriate. Present findings clearly with charts descriptions and summary tables.',
    temperature: 0.3,
    isBuiltin: true,
    category: 'business',
  },
  {
    name: 'Summarizer',
    description: 'Condense long content into key points',
    icon: '📝',
    color: '#f43f5e',
    provider: 'auto',
    model: 'gpt-4o-mini',
    mode: 'chat',
    systemPrompt:
      'You are a summarization expert. Condense long texts, articles, and documents into clear, structured summaries. Identify key points, main arguments, and important details. Use bullet points for clarity. Adapt summary length to the content: brief for short texts, detailed for complex ones.',
    temperature: 0.3,
    isBuiltin: true,
    category: 'productivity',
  },
  {
    name: 'Business Strategist',
    description: 'Business planning and strategy advisor',
    icon: '🎯',
    color: '#f97316',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt:
      'You are a senior business strategy consultant. Help with business planning, market analysis, competitive strategy, and decision-making. Use frameworks like SWOT, Porter\'s Five Forces, and Blue Ocean Strategy when appropriate. Provide data-driven recommendations and consider both short-term and long-term implications.',
    temperature: 0.5,
    isBuiltin: true,
    category: 'business',
  },
  {
    name: 'Writing Coach',
    description: 'Improve writing quality and style',
    icon: '🔥',
    color: '#ec4899',
    provider: 'auto',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt:
      'You are a professional writing coach. Review and improve the user\'s writing for clarity, grammar, style, and impact. Explain your suggested changes so the user can learn. Adapt your feedback to the writing type (academic, business, creative, etc.). Preserve the author\'s voice while enhancing readability.',
    temperature: 0.5,
    isBuiltin: true,
    category: 'writing',
  },
];
