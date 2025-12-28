/**
 * Memory type definitions
 */

export type MemoryType = 'preference' | 'fact' | 'instruction' | 'context';
export type MemorySource = 'explicit' | 'inferred';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  source: MemorySource;
  category?: string;
  tags?: string[];
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
  enabled: boolean;
  pinned?: boolean; // Pinned memories are always included in prompts
  priority?: number; // Higher priority = included first (0-10, default 5)
}

export interface CreateMemoryInput {
  type: MemoryType;
  content: string;
  source?: MemorySource;
  category?: string;
  tags?: string[];
}

export interface UpdateMemoryInput {
  content?: string;
  type?: MemoryType;
  category?: string;
  tags?: string[];
  enabled?: boolean;
  pinned?: boolean;
  priority?: number;
}

export interface MemorySettings {
  enabled: boolean;
  autoInfer: boolean;
  maxMemories: number;
  injectInSystemPrompt: boolean;
}

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  enabled: true,
  autoInfer: true,
  maxMemories: 100,
  injectInSystemPrompt: true,
};
