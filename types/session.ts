/**
 * Session type definitions
 */

import type { UIMessage } from './message';
import type { ProviderName } from './provider';

export type { ProviderName };

export type ChatMode = 'chat' | 'agent' | 'research';

export interface ConversationBranch {
  id: string;
  name: string;
  parentBranchId?: string; // null for main branch
  branchPointMessageId: string; // The message where this branch was created
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
}

export interface Session {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;

  // Model configuration
  provider: ProviderName;
  model: string;

  // Session settings
  systemPrompt?: string;
  builtinPrompts?: Array<{ id: string; name: string; content: string; description?: string }>;
  temperature?: number;
  maxTokens?: number;

  // Chat mode
  mode: ChatMode;

  // Features
  enableTools?: boolean;
  enableResearch?: boolean;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;

  // Preset reference
  presetId?: string;

  // Project association
  projectId?: string;

  // Branching support
  branches?: ConversationBranch[];
  activeBranchId?: string; // null means main branch

  // Metadata
  messageCount?: number;
  lastMessagePreview?: string;

  // Pin status
  pinned?: boolean;
}

export interface SessionWithMessages extends Session {
  messages: UIMessage[];
}

export interface CreateSessionInput {
  title?: string;
  provider?: ProviderName;
  model?: string;
  mode?: ChatMode;
  systemPrompt?: string;
  projectId?: string;
}

export interface UpdateSessionInput {
  title?: string;
  provider?: ProviderName;
  model?: string;
  mode?: ChatMode;
  systemPrompt?: string;
  builtinPrompts?: Array<{ id: string; name: string; content: string; description?: string }>;
  temperature?: number;
  maxTokens?: number;
  projectId?: string;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  presetId?: string;
}
