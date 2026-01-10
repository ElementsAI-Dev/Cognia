/**
 * Session type definitions
 */

import type { UIMessage } from './message';
import type { ProviderName } from './provider';
import type { SessionCompressionOverrides } from './compression';

export type { ProviderName, UIMessage };

export type ChatMode = 'chat' | 'agent' | 'research' | 'learning';

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
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;

  // Chat mode
  mode: ChatMode;

  // Agent sub-mode (when mode is 'agent')
  agentModeId?: string;

  // Features
  enableTools?: boolean;
  enableResearch?: boolean;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  
  // Response mode (streaming vs blocking)
  // undefined = use global setting, true = streaming, false = blocking
  streamingEnabled?: boolean;

  // Preset reference
  presetId?: string;

  // Project association
  projectId?: string;

  // Virtual environment association
  virtualEnvId?: string;
  virtualEnvPath?: string;

  // Branching support
  branches?: ConversationBranch[];
  activeBranchId?: string; // null means main branch

  // Metadata
  messageCount?: number;
  lastMessagePreview?: string;

  // Pin status
  pinned?: boolean;

  // Compression overrides (per-session settings)
  compressionOverrides?: SessionCompressionOverrides;

  // Carried context from previous session (when switching modes)
  carriedContext?: {
    fromSessionId: string;
    fromMode: ChatMode;
    summary: string;
    carriedAt: Date;
  };

  // History context from recent sessions (compressed summaries)
  historyContext?: {
    contextText: string;
    sessionCount: number;
    generatedAt: Date;
  };
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
  virtualEnvId?: string;
  carriedContext?: {
    fromSessionId: string;
    fromMode: ChatMode;
    summary: string;
    carriedAt: Date;
  };
  historyContext?: {
    contextText: string;
    sessionCount: number;
    generatedAt: Date;
  };
}

export interface UpdateSessionInput {
  title?: string;
  provider?: ProviderName;
  model?: string;
  mode?: ChatMode;
  agentModeId?: string;
  systemPrompt?: string;
  builtinPrompts?: Array<{ id: string; name: string; content: string; description?: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  projectId?: string;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  streamingEnabled?: boolean;
  presetId?: string;
  compressionOverrides?: SessionCompressionOverrides;
  virtualEnvId?: string;
  virtualEnvPath?: string;
}
