/**
 * Base Plugin Hooks
 *
 * @description Base hook definitions that plugins can implement.
 * Hooks allow plugins to respond to application events and modify behavior.
 */

import type { PluginA2UIAction, PluginA2UIDataChange } from '../a2ui/types';
import type { PluginAgentStep } from '../tools/types';

/**
 * Message structure
 */
export interface PluginMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook definitions that plugins can implement
 *
 * @remarks
 * Hooks allow plugins to respond to application events and modify behavior.
 * All hooks are optional - plugins only implement what they need.
 *
 * @example
 * ```typescript
 * const hooks: PluginHooks = {
 *   onEnable: async () => {
 *     console.log('Plugin enabled!');
 *   },
 *   onAgentStep: (agentId, step) => {
 *     console.log(`Agent step: ${step.type}`);
 *   },
 * };
 * ```
 *
 * @see {@link PluginHooksAll} for additional event hooks
 */
export interface PluginHooks {
  // Lifecycle hooks
  /** Called when plugin is loaded */
  onLoad?: () => Promise<void> | void;

  /** Called when plugin is enabled */
  onEnable?: () => Promise<void> | void;

  /** Called when plugin is disabled */
  onDisable?: () => Promise<void> | void;

  /** Called when plugin is unloaded */
  onUnload?: () => Promise<void> | void;

  /** Called when plugin configuration changes */
  onConfigChange?: (config: Record<string, unknown>) => void;

  // A2UI hooks
  /** Called when an A2UI surface is created */
  onA2UISurfaceCreate?: (surfaceId: string, type: string) => void;

  /** Called when an A2UI surface is destroyed */
  onA2UISurfaceDestroy?: (surfaceId: string) => void;

  /** Called when an A2UI action is triggered */
  onA2UIAction?: (action: PluginA2UIAction) => void | Promise<void>;

  /** Called when A2UI data changes */
  onA2UIDataChange?: (change: PluginA2UIDataChange) => void;

  // Agent hooks
  /** Called when an agent starts */
  onAgentStart?: (agentId: string, config: Record<string, unknown>) => void;

  /** Called for each agent step */
  onAgentStep?: (agentId: string, step: PluginAgentStep) => void;

  /** Called when an agent calls a tool (can intercept/modify) */
  onAgentToolCall?: (agentId: string, tool: string, args: unknown) => unknown | Promise<unknown>;

  /** Called when an agent completes */
  onAgentComplete?: (agentId: string, result: unknown) => void;

  /** Called when an agent errors */
  onAgentError?: (agentId: string, error: Error) => void;

  // Message hooks
  /** Called when a message is sent (can modify) */
  onMessageSend?: (message: PluginMessage) => PluginMessage | Promise<PluginMessage>;

  /** Called when a message is received (can modify) */
  onMessageReceive?: (message: PluginMessage) => PluginMessage | Promise<PluginMessage>;

  /** Called to render a custom message UI */
  onMessageRender?: (message: PluginMessage) => unknown; // React.ReactNode | null

  /** Called when a message is deleted */
  onMessageDelete?: (messageId: string, sessionId: string) => void;

  /** Called when a message is edited */
  onMessageEdit?: (messageId: string, oldContent: string, newContent: string, sessionId: string) => void;

  // Session hooks
  /** Called when a session is created */
  onSessionCreate?: (sessionId: string) => void;

  /** Called when switching to a session */
  onSessionSwitch?: (sessionId: string) => void;

  /** Called when a session is deleted */
  onSessionDelete?: (sessionId: string) => void;

  /** Called when a session is renamed */
  onSessionRename?: (sessionId: string, oldTitle: string, newTitle: string) => void;

  /** Called when all messages in a session are cleared */
  onSessionClear?: (sessionId: string) => void;

  // Command hooks
  /** Called when a command is executed (return true to handle) */
  onCommand?: (command: string, args: string[]) => boolean | Promise<boolean>;

  // Chat flow hooks
  /** Called when user regenerates an AI response */
  onChatRegenerate?: (messageId: string, sessionId: string) => void;

  /** Called when the AI model/provider is switched */
  onModelSwitch?: (provider: string, model: string, previousProvider?: string, previousModel?: string) => void;

  /** Called when chat mode switches (chat/agent/learning) */
  onChatModeSwitch?: (sessionId: string, newMode: string, previousMode: string) => void;

  /** Called when the system prompt is changed at runtime */
  onSystemPromptChange?: (sessionId: string, newPrompt: string, previousPrompt?: string) => void;

  // Agent plan hooks
  /** Called when an agent creates an execution plan */
  onAgentPlanCreate?: (agentId: string, tasks: { id: string; description: string }[]) => void;

  /** Called when an agent plan step completes */
  onAgentPlanStepComplete?: (agentId: string, taskId: string, result: string, success: boolean) => void;

  // Scheduler hooks
  /** Called when a scheduled task starts execution */
  onScheduledTaskStart?: (taskId: string, executionId: string) => void;
  /** Called when a scheduled task completes successfully */
  onScheduledTaskComplete?: (
    taskId: string,
    executionId: string,
    result: { success: boolean; output?: Record<string, unknown>; error?: string }
  ) => void;
  /** Called when a scheduled task fails */
  onScheduledTaskError?: (taskId: string, executionId: string, error: Error) => void;
}

/**
 * Hook priority levels
 *
 * @remarks
 * Determines the order in which hooks are executed. Higher priority
 * hooks execute first.
 */
export type HookPriority = 'high' | 'normal' | 'low';

/**
 * Hook registration options
 *
 * @remarks
 * Additional options for hook registration including priority,
 * cancellability, and timeout.
 */
export interface HookRegistrationOptions {
  /** Priority level for hook execution order */
  priority?: HookPriority;

  /** Whether this hook can cancel the event */
  cancellable?: boolean;

  /** Timeout in ms for async hooks */
  timeout?: number;
}

/**
 * Hook execution result
 *
 * @remarks
 * Returned by hook execution to indicate success, failure, or skip.
 */
export interface HookSandboxExecutionResult<T = unknown> {
  /** Whether hook executed successfully */
  success: boolean;

  /** Result value if any */
  result?: T;

  /** Error if hook failed */
  error?: Error;

  /** Plugin ID that produced the result */
  pluginId: string;

  /** Execution time in ms */
  executionTime: number;

  /** Duration in ms (alternative to executionTime) */
  duration?: number;

  /** Whether hook was skipped */
  skipped?: boolean;
}
