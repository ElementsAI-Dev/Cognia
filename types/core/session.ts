/**
 * Session type definitions
 */

import type { UIMessage } from './message';
import type { ProviderName } from '../provider/provider';
import type { SessionCompressionOverrides } from '../system/compression';
import type { ChatViewMode, FlowChatCanvasState, MultiModelConfig } from '../chat';

export type { ProviderName, UIMessage, ChatViewMode, FlowChatCanvasState };

export type ChatMode = 'chat' | 'agent' | 'research' | 'learning';

export type ChatGoalStatus = 'active' | 'completed' | 'paused';

export interface ChatFolder {
  id: string;
  name: string;
  order: number;
  isExpanded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalStep {
  id: string;
  content: string;
  completed: boolean;
  order: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface ChatGoal {
  id: string;
  content: string;
  status: ChatGoalStatus;
  progress?: number; // 0-100, auto-calculated from steps if steps exist
  steps?: GoalStep[]; // Multi-step goal support
  originalContent?: string; // Original content before AI polish
  isPolished?: boolean; // Whether the goal was polished by AI
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

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

  // Customization
  customIcon?: string; // Base64 or URL
  folderId?: string;

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

  // Flow chat canvas state (for flow view mode)
  viewMode?: ChatViewMode;
  flowCanvasState?: FlowChatCanvasState;

  // Conversation goal - what this chat aims to achieve
  goal?: ChatGoal;

  // Multi-model arena mode configuration
  multiModelConfig?: MultiModelConfig;
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
  viewMode?: ChatViewMode;
  flowCanvasState?: FlowChatCanvasState;
  goal?: ChatGoal;
  multiModelConfig?: MultiModelConfig;
}

export interface CreateGoalInput {
  content: string;
  progress?: number;
  steps?: Array<{ content: string }>;
  originalContent?: string;
  isPolished?: boolean;
}

export interface UpdateGoalInput {
  content?: string;
  status?: ChatGoalStatus;
  progress?: number;
  originalContent?: string;
  isPolished?: boolean;
}

export interface CreateStepInput {
  content: string;
}

export interface UpdateStepInput {
  content?: string;
  completed?: boolean;
}
