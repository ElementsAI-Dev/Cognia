/**
 * Tool Integration Types
 *
 * @description Type definitions for AI agent tool integration.
 * Tools are functions that AI agents can call during execution.
 */

/**
 * Tool definition in plugin manifest
 *
 * @remarks
 * Tools are functions that AI agents can call. They must have a name,
 * description, and JSON Schema for their parameters.
 *
 * @example
 * ```typescript
 * const toolDef: PluginToolDef = {
 *   name: 'web_search',
 *   description: 'Search the web for information',
 *   category: 'search',
 *   requiresApproval: false,
 *   parametersSchema: {
 *     type: 'object',
 *     properties: {
 *       query: {
 *         type: 'string',
 *         description: 'Search query',
 *       },
 *     },
 *     required: ['query'],
 *   },
 * };
 * ```
 *
 * @see {@link defineTool} helper for creating tools
 */
export interface PluginToolDef {
  /** Tool name */
  name: string;

  /** Description for AI */
  description: string;

  /** Category */
  category?: string;

  /** Whether tool requires user approval */
  requiresApproval?: boolean;

  /** JSON Schema for parameters */
  parametersSchema: Record<string, unknown>;
}

/**
 * Registered tool from plugin
 *
 * @remarks
 * Runtime representation of a registered tool with execution function.
 */
export interface PluginTool {
  /** Tool name */
  name: string;

  /** Plugin that provides this tool */
  pluginId: string;

  /** Tool definition */
  definition: PluginToolDef;

  /** Execute function */
  execute: (args: Record<string, unknown>, context: PluginToolContext) => Promise<unknown>;
}

/**
 * Context passed to tool execution
 *
 * @remarks
 * Provides contextual information and utilities during tool execution.
 */
export interface PluginToolContext {
  /** Current session ID */
  sessionId?: string;

  /** Current message ID */
  messageId?: string;

  /** Plugin configuration */
  config: Record<string, unknown>;

  /** Report progress (0-100) */
  reportProgress?: (progress: number, message?: string) => void;

  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Agent step information
 */
export interface PluginAgentStep {
  stepNumber: number;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
  content?: string;
  tool?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
}

/**
 * Agent API for tool and mode registration
 *
 * @remarks
 * Allows plugins to register tools and modes for AI agents.
 *
 * @example
 * ```typescript
 * // Register a tool
 * context.agent.registerTool({
 *   name: 'my_tool',
 *   pluginId: context.pluginId,
 *   definition: {
 *     name: 'my_tool',
 *     description: 'Does something',
 *     parametersSchema: { type: 'object', properties: {} },
 *   },
 *   execute: async (args, toolContext) => {
 *     return { result: 'success' };
 *   },
 * });
 *
 * // Register a mode
 * context.agent.registerMode({
 *   id: 'my-mode',
 *   name: 'My Mode',
 *   description: 'Specialized mode',
 *   icon: 'sparkles',
 *   systemPrompt: 'You are...',
 * });
 * ```
 */
export interface PluginAgentAPI {
  registerTool: (tool: PluginTool) => void;
  unregisterTool: (name: string) => void;
  registerMode: (mode: unknown) => void; // AgentModeConfig
  unregisterMode: (id: string) => void;
  executeAgent: (config: Record<string, unknown>) => Promise<unknown>;
  cancelAgent: (agentId: string) => void;
}
