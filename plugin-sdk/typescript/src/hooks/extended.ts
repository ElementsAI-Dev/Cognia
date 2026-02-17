/**
 * Plugin Hooks (Complete)
 *
 * @description Complete hook definitions for deeper integration with application features.
 * Includes additional event hooks for projects, canvas, artifacts, export, themes, AI flow,
 * scheduler, code execution, and MCP integrations.
 */

import type { PluginHooks, PluginMessage } from './base';
import type {
  ChatMode,
  KnowledgeFile,
  PluginArtifact,
  PluginCanvasDocument,
  PluginProject,
} from '../context/extended';
import type { PluginScheduledTask, PluginTaskTrigger } from '../api/scheduler';

export interface PromptAttachment {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'file' | 'document';
  url?: string;
  size?: number;
  mimeType?: string;
}

export interface PromptSubmitContext {
  attachments?: PromptAttachment[];
  mode: ChatMode;
  previousMessages: PluginMessage[];
}

export interface PromptSubmitResult {
  action: 'proceed' | 'block' | 'modify';
  modifiedPrompt?: string;
  additionalContext?: string;
  blockReason?: string;
}

export interface PreToolUseResult {
  action: 'allow' | 'deny' | 'modify';
  modifiedArgs?: unknown;
  denyReason?: string;
}

export interface PostToolUseResult {
  modifiedResult?: unknown;
  additionalMessages?: PluginMessage[];
}

export interface PreCompactContext {
  sessionId: string;
  messageCount: number;
  tokenCount: number;
  compressionRatio: number;
}

export interface PreCompactResult {
  contextToInject?: string;
  skipCompaction?: boolean;
  customStrategy?: 'aggressive' | 'moderate' | 'minimal';
}

export interface ChatResponseData {
  content: string;
  messageId: string;
  sessionId: string;
  model: string;
  provider: string;
}

export interface PostChatReceiveResult {
  modifiedContent?: string;
  additionalMessages?: PluginMessage[];
  metadata?: Record<string, unknown>;
}

/**
 * Complete plugin hooks combining base and event hooks.
 */
export interface PluginHooksAll extends PluginHooks {
  // Project hooks
  onProjectCreate?: (project: PluginProject) => void | Promise<void>;
  onProjectUpdate?: (project: PluginProject, changes: Partial<PluginProject>) => void | Promise<void>;
  onProjectDelete?: (projectId: string) => void | Promise<void>;
  onProjectSwitch?: (projectId: string | null, previousProjectId: string | null) => void;
  onKnowledgeFileAdd?: (projectId: string, file: KnowledgeFile) => void | Promise<void>;
  onKnowledgeFileRemove?: (projectId: string, fileId: string) => void | Promise<void>;
  onSessionLinked?: (projectId: string, sessionId: string) => void;
  onSessionUnlinked?: (projectId: string, sessionId: string) => void;

  // Canvas hooks
  onCanvasCreate?: (document: PluginCanvasDocument) => void | Promise<void>;
  onCanvasUpdate?: (document: PluginCanvasDocument, changes: Partial<PluginCanvasDocument>) => void;
  onCanvasDelete?: (documentId: string) => void;
  onCanvasSwitch?: (documentId: string | null) => void;
  onCanvasContentChange?: (documentId: string, content: string, previousContent: string) => void;
  onCanvasVersionSave?: (documentId: string, versionId: string) => void;
  onCanvasVersionRestore?: (documentId: string, versionId: string) => void;
  onCanvasSelection?: (documentId: string, selection: { start: number; end: number; text: string }) => void;

  // Artifact hooks
  onArtifactCreate?: (artifact: PluginArtifact) => void | Promise<void>;
  onArtifactUpdate?: (artifact: PluginArtifact, changes: Partial<PluginArtifact>) => void;
  onArtifactDelete?: (artifactId: string) => void;
  onArtifactOpen?: (artifactId: string) => void;
  onArtifactClose?: () => void;
  onArtifactExecute?: (artifactId: string, result: { success: boolean; error?: string }) => void;
  onArtifactExport?: (artifactId: string, format: string) => void;

  // Export hooks
  onExportStart?: (sessionId: string, format: string) => void | Promise<void>;
  onExportComplete?: (sessionId: string, format: string, success: boolean) => void;
  onExportTransform?: (content: string, format: string) => string | Promise<string>;
  onProjectExportStart?: (projectId: string, format: string) => void | Promise<void>;
  onProjectExportComplete?: (projectId: string, format: string, success: boolean) => void;

  // Theme hooks
  onThemeModeChange?: (mode: 'light' | 'dark' | 'system', resolvedMode: 'light' | 'dark') => void;
  onColorPresetChange?: (preset: string) => void;
  onCustomThemeActivate?: (themeId: string) => void;

  // AI hooks
  onChatRequest?: (messages: PluginMessage[], model: string) => PluginMessage[] | Promise<PluginMessage[]>;
  onUserPromptSubmit?: (
    prompt: string,
    sessionId: string,
    context: PromptSubmitContext
  ) => PromptSubmitResult | Promise<PromptSubmitResult>;
  onPreToolUse?: (
    toolName: string,
    toolArgs: unknown,
    sessionId: string
  ) => PreToolUseResult | Promise<PreToolUseResult>;
  onPostToolUse?: (
    toolName: string,
    toolArgs: unknown,
    toolResult: unknown,
    sessionId: string
  ) => PostToolUseResult | Promise<PostToolUseResult>;
  onPreCompact?: (context: PreCompactContext) => PreCompactResult | Promise<PreCompactResult>;
  onPostChatReceive?: (
    response: ChatResponseData
  ) => PostChatReceiveResult | Promise<PostChatReceiveResult>;
  onStreamStart?: (sessionId: string) => void;
  onStreamChunk?: (sessionId: string, chunk: string, fullContent: string) => void;
  onStreamEnd?: (sessionId: string, finalContent: string) => void;
  onChatError?: (sessionId: string, error: Error) => void;
  onTokenUsage?: (sessionId: string, usage: { prompt: number; completion: number; total: number }) => void;

  // Vector/RAG hooks
  onDocumentsIndexed?: (collection: string, count: number) => void;
  onVectorSearch?: (collection: string, query: string, resultCount: number) => void;
  onRAGContextRetrieved?: (sessionId: string, sources: { id: string; content: string; score: number }[]) => void;

  // Workflow hooks
  onWorkflowStart?: (workflowId: string, name: string) => void;
  onWorkflowStepComplete?: (workflowId: string, stepIndex: number, result: unknown) => void;
  onWorkflowComplete?: (workflowId: string, success: boolean, result?: unknown) => void;
  onWorkflowError?: (workflowId: string, error: Error) => void;

  // UI hooks
  onSidebarToggle?: (visible: boolean) => void;
  onPanelOpen?: (panelId: string) => void;
  onPanelClose?: (panelId: string) => void;
  onShortcut?: (shortcut: string) => boolean | void;
  onContextMenuShow?: (
    context: { type: string; target?: unknown }
  ) => { items?: Array<Record<string, unknown>> } | void;

  // External Agent hooks
  onExternalAgentConnect?: (agentId: string, agentName: string) => void;
  onExternalAgentDisconnect?: (agentId: string) => void;
  onExternalAgentExecutionStart?: (agentId: string, sessionId: string, prompt: string) => void;
  onExternalAgentExecutionComplete?: (
    agentId: string,
    sessionId: string,
    success: boolean,
    response?: string
  ) => void;
  onExternalAgentPermissionRequest?: (
    agentId: string,
    sessionId: string,
    toolName: string,
    reason?: string
  ) => void;
  onExternalAgentToolCall?: (
    agentId: string,
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => void;
  onExternalAgentError?: (agentId: string, error: string) => void;

  // Scheduler hooks (extended)
  onScheduledTaskCreate?: (task: {
    id: string;
    pluginId: string;
    name: string;
    trigger: PluginTaskTrigger;
    handler: string;
  }) => void;
  onScheduledTaskUpdate?: (
    task: Pick<PluginScheduledTask, 'id' | 'pluginId' | 'name'>,
    changes: Partial<PluginScheduledTask>
  ) => void;
  onScheduledTaskDelete?: (taskId: string) => void;
  onScheduledTaskPause?: (taskId: string) => void;
  onScheduledTaskResume?: (taskId: string) => void;
  onScheduledTaskBeforeRun?: (taskId: string, executionId: string) => boolean | Promise<boolean>;

  // Code execution hooks
  onCodeExecutionStart?: (language: string, code: string, sandboxId?: string) => void;
  onCodeExecutionComplete?: (language: string, result: unknown, sandboxId?: string) => void;
  onCodeExecutionError?: (language: string, error: Error, sandboxId?: string) => void;

  // MCP hooks
  onMCPServerConnect?: (serverId: string, serverName: string) => void;
  onMCPServerDisconnect?: (serverId: string) => void;
  onMCPToolCall?: (serverId: string, toolName: string, args: Record<string, unknown>) => void;
  onMCPToolResult?: (serverId: string, toolName: string, result: unknown) => void;
}

/**
 * @deprecated Use `PluginHooksAll` instead
 */
export type ExtendedPluginHooks = PluginHooksAll;
