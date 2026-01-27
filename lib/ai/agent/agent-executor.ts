/**
 * Agent Executor - Execute multi-step agent tasks with tool calling
 * 
 * Features:
 * - AI SDK native tool calling with generateText
 * - Multiple stop conditions (stepCount, hasToolCall, noToolCalls, custom)
 * - prepareStep callback for dynamic step configuration
 * - onStepFinish for observability
 * - Tool approval workflow
 * - Comprehensive error handling
 */

import { generateText, stepCountIs } from 'ai';
import { z } from 'zod';
import { getProviderModel, type ProviderName } from '../core/client';
import { isMcpTool, extractMcpServerInfo } from '../tools/mcp-tools';
import { globalToolCache, type ToolCacheConfig } from '../tools/tool-cache';
import { globalMetricsCollector } from './performance-metrics';
import { globalMemoryManager, type MemoryEntry } from './memory-manager';
import { getPluginLifecycleHooks } from '@/lib/plugin/hooks-system';
import {
  type StopCondition as FunctionalStopCondition,
  type StopConditionResult,
  checkStopCondition,
  defaultStopCondition,
  type AgentExecutionState as StopConditionState,
  stepCountIs as functionalStepCountIs,
  durationExceeds,
  noToolCalls as functionalNoToolCalls,
  toolCalled,
  responseContains,
  allToolsSucceeded,
  anyToolFailed,
  allOf,
  anyOf,
  not,
  namedCondition,
} from './stop-conditions';
import {
  checkToolCallSafety,
  type SafetyCheckOptions,
  getSafetyWarningMessage,
} from '../core/middleware';
import {
  createAgentObservabilityManager,
  type AgentObservabilityManager,
} from '../observability/agent-observability';
import {
  createToolCallManager,
  type ToolCallManager,
  type PendingToolResult,
} from '../tools/tool-call-manager';

/**
 * Format memory entries as context for the system prompt
 */
function formatMemoriesAsContext(memories: MemoryEntry[]): string {
  return memories
    .map((m, i) => {
      const valueStr = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
      return `${i + 1}. [${m.key}] ${valueStr.slice(0, 300)}${valueStr.length > 300 ? '...' : ''}`;
    })
    .join('\n');
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error' | 'queued' | 'timeout' | 'cancelled';
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  /** MCP server ID if this is an MCP tool call */
  mcpServerId?: string;
  /** MCP server display name */
  mcpServerName?: string;
  /** Whether this tool call is blocking (waits for result) */
  isBlocking?: boolean;
  /** Execution mode used for this call */
  executionMode?: 'blocking' | 'non-blocking';
  /** Priority for queue ordering (lower = higher priority) */
  priority?: number;
  /** Duration of execution in milliseconds */
  duration?: number;
}

export interface AgentExecutionState {
  stepCount: number;
  startTime: Date;
  lastResponse?: string;
  lastToolCalls: ToolCall[];
  conversationHistory: Array<{ role: string; content: string }>;
  isRunning: boolean;
  error?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: z.ZodType;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  requiresApproval?: boolean;
}

/**
 * Retry configuration for tool calls
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableErrors: ['timeout', 'rate_limit', 'network', 'econnrefused', 'etimedout'],
};

/**
 * ReAct format options
 */
export type ReActFormat = 'standard' | 'detailed' | 'minimal' | 'disabled';

/**
 * Build ReAct system prompt for explicit reasoning
 */
export function buildReActSystemPrompt(format: ReActFormat): string {
  if (format === 'disabled') return '';

  const basePrompt = `You are a reasoning agent. For each step, you MUST think explicitly before acting.`;

  switch (format) {
    case 'standard':
      return `${basePrompt}

Format your response as:
Thought: [your reasoning about what to do next]
Action: [tool name and parameters, or "finish" if done]

Example:
Thought: I need to search for information about X
Action: web_search(query="X")`;

    case 'detailed':
      return `${basePrompt}

Format your response as:
Thought: [your reasoning about what to do next]
Action: [tool name and parameters, or "finish" if done]
Observation: [will be filled automatically after tool execution]

Example:
Thought: The user is asking about X. I should search for current information.
Action: web_search(query="X", max_results=5)
Observation: [search results will appear here]
Thought: Based on the results, I now have enough information to answer.
Action: finish`;

    case 'minimal':
      return `${basePrompt}

Think step-by-step before taking any action. Use tools when needed to gather information.`;

    default:
      return '';
  }
}

/**
 * Parse ReAct response to extract thought and action
 */
export function parseReActResponse(response: string, format: ReActFormat): {
  thought?: string;
  actionDescription?: string;
  observation?: string;
} {
  if (format === 'disabled' || format === 'minimal') {
    return {};
  }

  const result: {
    thought?: string;
    actionDescription?: string;
    observation?: string;
  } = {};

  // Extract Thought
  const thoughtMatch = response.match(/Thought:\s*([\s\S]*?)(?=\n(?:Action|Observation)|$)/i);
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  // Extract Action
  const actionMatch = response.match(/Action:\s*([\s\S]*?)(?=\n(?:Thought|Observation)|$)/i);
  if (actionMatch) {
    result.actionDescription = actionMatch[1].trim();
  }

  // Extract Observation
  const observationMatch = response.match(/Observation:\s*([\s\S]*?)(?=\n(?:Thought|Action)|$)/i);
  if (observationMatch) {
    result.observation = observationMatch[1].trim();
  }

  return result;
}

export type StopCondition =
  | { type: 'stepCount'; count: number }
  | { type: 'hasToolCall'; toolName: string }
  | { type: 'noToolCalls' }
  | { type: 'custom'; check: (state: AgentExecutionState) => boolean }
  | { type: 'functional'; condition: FunctionalStopCondition; name?: string };

export interface PrepareStepResult {
  temperature?: number;
  systemPrompt?: string;
  additionalContext?: string;
}

export interface AgentConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  /** System prompt for the agent */
  systemPrompt?: string;
  temperature?: number;
  /** Maximum number of steps */
  maxSteps?: number;
  /** Stop conditions for agent execution */
  stopConditions?: StopCondition[];
  /** Functional stop conditions from stop-conditions.ts API */
  functionalStopConditions?: FunctionalStopCondition[];
  /** Use default stop condition (stepCount OR noToolCalls) */
  useDefaultStopCondition?: boolean;
  /** Available tools */
  tools?: Record<string, AgentTool>;
  /** Callback when agent starts */
  onStart?: () => void;
  /** Callback when a step starts */
  onStepStart?: (step: number) => void;
  /** Callback when a step completes */
  onStepComplete?: (step: number, response: string, toolCalls: ToolCall[]) => void;
  /** Callback when a tool is called */
  onToolCall?: (toolCall: ToolCall) => void;
  /** Callback when a tool returns a result */
  onToolResult?: (toolCall: ToolCall) => void;
  /** Callback when agent finishes */
  onFinish?: (result: AgentResult) => void;
  /** Callback when stop condition is triggered */
  onStopCondition?: (result: StopConditionResult) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Function to require approval for tool calls */
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>;
  /** Prepare step callback for dynamic step configuration */
  prepareStep?: (step: number, state: AgentExecutionState) => Promise<PrepareStepResult>;
  /** Safety check options for tool calls */
  safetyOptions?: SafetyCheckOptions;
  /** Session ID for observability tracking */
  sessionId?: string;
  /** User ID for observability tracking */
  userId?: string;
  /** Agent name for observability (defaults to 'agent') */
  agentName?: string;
  /** Enable observability tracking */
  enableObservability?: boolean;
  /** Enable Langfuse tracking */
  enableLangfuse?: boolean;
  /** Enable OpenTelemetry tracking */
  enableOpenTelemetry?: boolean;
  /** Enable explicit ReAct format */
  enableReAct?: boolean;
  /** ReAct format style */
  reactFormat?: ReActFormat;
  /** Tool cache configuration */
  toolCacheConfig?: Partial<ToolCacheConfig>;
  /** Tool retry configuration */
  toolRetryConfig?: RetryConfig;
  /** Enable performance metrics collection */
  enableMetrics?: boolean;
  /** Enable memory integration for context persistence */
  enableMemory?: boolean;
  /** Tool execution mode: blocking waits for results, non-blocking returns immediately */
  toolExecutionMode?: 'blocking' | 'non-blocking';
  /** Maximum concurrent tool executions (default: 5) */
  maxConcurrentToolCalls?: number;
  /** Whether to collect pending tool results before returning (default: true) */
  collectPendingToolResults?: boolean;
  /** Default timeout for tool calls in milliseconds */
  toolTimeout?: number;
  /** Tags for memory queries */
  memoryTags?: string[];
  /** Maximum number of memories to load as context */
  memoryLimit?: number;
  /** Whether to persist execution results to memory */
  persistToMemory?: boolean;
}

export interface AgentResult {
  success: boolean;
  finalResponse: string;
  steps: AgentStep[];
  totalSteps: number;
  duration: number;
  toolResults?: Array<{ toolCallId: string; toolName: string; result: unknown }>;
  error?: string;
  /** Pending tool calls that haven't completed (non-blocking mode) */
  pendingToolCalls?: ToolCall[];
  /** Statistics about tool execution */
  toolExecutionStats?: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    avgDuration: number;
  };
}

export interface AgentStep {
  stepNumber: number;
  response: string;
  toolCalls: ToolCall[];
  timestamp: Date;
  finishReason?: 'stop' | 'tool-calls' | 'length' | 'content-filter' | 'error' | 'other';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  // Explicit ReAct fields
  thought?: string;
  actionDescription?: string;
  observation?: string;
}

/**
 * Options for SDK tool creation with parallel execution support
 */
interface SDKToolOptions {
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolCall: ToolCall) => void;
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>;
  safetyOptions?: SafetyCheckOptions;
  retryConfig?: RetryConfig;
  enableCache?: boolean;
  agentId?: string;
  /** Tool call manager for parallel execution */
  toolCallManager?: ToolCallManager;
  /** Execution mode for this tool */
  executionMode?: 'blocking' | 'non-blocking';
  /** Timeout for this tool call */
  toolTimeout?: number;
}

/**
 * Create an AI SDK compatible tool object from an AgentTool definition
 * This builds the tool object manually to avoid complex type issues with the tool() helper
 */
function createSDKTool(
  name: string,
  agentTool: AgentTool,
  toolCallTracker: Map<string, ToolCall>,
  options: SDKToolOptions = {}
) {
  const {
    onToolCall,
    onToolResult,
    requireApproval,
    safetyOptions,
    retryConfig,
    enableCache,
    agentId,
    toolCallManager,
    executionMode = 'blocking',
    toolTimeout,
  } = options;
  // Extract MCP server info if this is an MCP tool
  const mcpInfo = isMcpTool(name) ? extractMcpServerInfo(name) : null;

  return {
    description: agentTool.description,
    parameters: agentTool.parameters,
    execute: async (args: z.infer<typeof agentTool.parameters>) => {
      const toolCallId = `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toolCall: ToolCall = {
        id: toolCallId,
        name,
        args: args as Record<string, unknown>,
        status: 'pending',
        startedAt: new Date(),
        // Include MCP server info if available
        mcpServerId: mcpInfo?.serverId,
        // Parallel execution metadata
        isBlocking: executionMode === 'blocking',
        executionMode,
        priority: 5, // Default priority
      };

      toolCallTracker.set(toolCallId, toolCall);
      onToolCall?.(toolCall);

      // Check cache if enabled
      let cached = false;
      if (enableCache) {
        const cachedResult = globalToolCache.get(name, args as Record<string, unknown>);
        if (cachedResult !== null) {
          cached = true;
          toolCall.status = 'completed';
          toolCall.result = cachedResult;
          toolCall.completedAt = new Date();
          onToolResult?.(toolCall);
          return cachedResult;
        }
      }

      // Apply safety checks if enabled
      if (safetyOptions && safetyOptions.checkToolCalls) {
        const safetyCheck = checkToolCallSafety(name, args as Record<string, unknown>, safetyOptions);
        if (safetyCheck.blocked) {
          toolCall.status = 'error';
          toolCall.error = getSafetyWarningMessage(safetyCheck) || 'Tool call blocked by safety mode';
          toolCall.completedAt = new Date();
          onToolResult?.(toolCall);
          throw new Error(toolCall.error);
        }
      }

      // Check if approval is required
      if (agentTool.requiresApproval && requireApproval) {
        const approved = await requireApproval(toolCall);
        if (!approved) {
          toolCall.status = 'error';
          toolCall.error = 'Tool call rejected by user';
          toolCall.completedAt = new Date();
          onToolResult?.(toolCall);
          throw new Error('Tool call rejected by user');
        }
      }

      toolCall.status = 'running';

      // Dispatch tool call hook before execution
      if (agentId) {
        try {
          await getPluginLifecycleHooks().dispatchOnAgentToolCall(agentId, name, args as Record<string, unknown>);
        } catch (hookError) {
          // If hook throws, log but don't block execution
          console.warn('Agent tool call hook error:', hookError);
        }
      }

      // Core execution function with retry logic
      const executeWithRetry = async (): Promise<unknown> => {
        const actualRetryConfig = retryConfig || DEFAULT_RETRY_CONFIG;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= actualRetryConfig.maxRetries; attempt++) {
          try {
            const result = await agentTool.execute(args as Record<string, unknown>);
            
            // Cache the result if not from cache
            if (!cached && enableCache) {
              globalToolCache.set(name, args as Record<string, unknown>, result);
            }

            return result;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Tool execution failed');
            
            // Check if error is retryable
            const isRetryable = actualRetryConfig.retryableErrors.some(pattern => 
              lastError!.message.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (!isRetryable || attempt === actualRetryConfig.maxRetries) {
              throw lastError;
            }
            
            // Calculate delay with exponential backoff
            const delay = actualRetryConfig.exponentialBackoff
              ? actualRetryConfig.retryDelay * Math.pow(2, attempt)
              : actualRetryConfig.retryDelay;
            
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        throw lastError || new Error('Tool execution failed');
      };

      // Use ToolCallManager if provided for parallel execution support
      if (toolCallManager) {
        try {
          const result = await toolCallManager.enqueue(
            toolCall,
            executeWithRetry,
            {
              blocking: executionMode === 'blocking',
              timeout: toolTimeout,
              priority: toolCall.priority,
            }
          );

          // For non-blocking mode, result may be a PendingToolResult
          if (executionMode === 'non-blocking' && result && typeof result === 'object' && 'status' in result) {
            // Return pending indicator for non-blocking execution
            return { pending: true, pendingId: (result as PendingToolResult).id };
          }

          // Update toolCall with result
          toolCall.status = 'completed';
          toolCall.result = result;
          toolCall.completedAt = new Date();
          toolCall.duration = toolCall.completedAt.getTime() - (toolCall.startedAt?.getTime() || 0);
          onToolResult?.(toolCall);
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Tool execution failed');
          toolCall.status = err.message.includes('timeout') ? 'timeout' : 'error';
          toolCall.error = err.message;
          toolCall.completedAt = new Date();
          toolCall.duration = toolCall.completedAt.getTime() - (toolCall.startedAt?.getTime() || 0);
          onToolResult?.(toolCall);
          throw err;
        }
      }

      // Fallback to direct execution without manager
      try {
        const result = await executeWithRetry();
        toolCall.status = 'completed';
        toolCall.result = result;
        toolCall.completedAt = new Date();
        toolCall.duration = toolCall.completedAt.getTime() - (toolCall.startedAt?.getTime() || 0);
        onToolResult?.(toolCall);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Tool execution failed');
        toolCall.status = 'error';
        toolCall.error = err.message;
        toolCall.completedAt = new Date();
        toolCall.duration = toolCall.completedAt.getTime() - (toolCall.startedAt?.getTime() || 0);
        onToolResult?.(toolCall);
        throw err;
      }
    },
  };
}

/**
 * Options for converting tools to AI SDK format
 */
interface ConvertToolsOptions extends SDKToolOptions {
  /** Tool call manager for parallel execution */
  toolCallManager?: ToolCallManager;
}

/**
 * Convert AgentTool record to AI SDK tools format
 */
function convertToAISDKTools(
  tools: Record<string, AgentTool>,
  toolCallTracker: Map<string, ToolCall>,
  options: ConvertToolsOptions = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdkTools: Record<string, any> = {};

  for (const [name, agentTool] of Object.entries(tools)) {
    sdkTools[name] = createSDKTool(name, agentTool, toolCallTracker, options);
  }

  return sdkTools;
}

/**
 * Execute an agent task with multi-step tool calling using AI SDK native tools
 */
export async function executeAgent(
  prompt: string,
  config: AgentConfig
): Promise<AgentResult> {
  const {
    provider,
    model,
    apiKey,
    baseURL,
    systemPrompt = '',
    temperature = 0.7,
    maxSteps = 10,
    stopConditions = [],
    functionalStopConditions = [],
    useDefaultStopCondition = false,
    tools = {},
    onStepStart,
    onStepComplete,
    onToolCall,
    onToolResult,
    onError,
    requireApproval,
    prepareStep: prepareStepCallback,
    onFinish,
    onStopCondition,
    sessionId,
    userId,
    agentName = 'agent',
    enableObservability = true,
    enableReAct = false,
    reactFormat = 'standard',
    toolCacheConfig,
    toolRetryConfig,
    enableMetrics = true,
  } = config;

  // Memory configuration
  const enableMemoryValue = config.enableMemory ?? false;
  const memoryTagsValue = config.memoryTags ?? ['agent-context'];
  const memoryLimitValue = config.memoryLimit ?? 5;
  const persistToMemoryValue = config.persistToMemory ?? false;

  // Initialize observability manager if enabled
  let observabilityManager: AgentObservabilityManager | null = null;
  if (enableObservability && sessionId) {
    observabilityManager = createAgentObservabilityManager({
      sessionId,
      userId,
      agentName,
      task: prompt,
      enableLangfuse: config.enableLangfuse ?? true,
      enableOpenTelemetry: config.enableOpenTelemetry ?? true,
      metadata: {
        provider,
        model,
        maxSteps,
      },
    });
    observabilityManager.startAgentExecution();
  }

  const modelInstance = getProviderModel(provider, model, apiKey, baseURL);
  const startTime = new Date();
  const steps: AgentStep[] = [];
  const toolCallTracker = new Map<string, ToolCall>();

  // Generate agent ID for tracking
  const agentId = `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Dispatch agent start hook
  getPluginLifecycleHooks().dispatchOnAgentStart(agentId, {
    provider,
    model,
    prompt,
    maxSteps,
    tools: Object.keys(tools),
  });

  // Start metrics collection if enabled
  const executionId = enableMetrics ? globalMetricsCollector.startExecution(undefined, sessionId) : undefined;

  const cleanupToolCalls = (reason: string) => {
    for (const toolCall of toolCallTracker.values()) {
      if (toolCall.status === 'pending' || toolCall.status === 'running') {
        toolCall.status = 'error';
        toolCall.error = reason;
        toolCall.completedAt = new Date();
        onToolResult?.(toolCall);
      }
    }
  };

  // Track step count for callbacks
  let stepCount = 0;
  let currentTemperature = temperature;
  let currentSystemPrompt = systemPrompt;
  
  // Add ReAct prompt if enabled
  if (enableReAct && reactFormat !== 'disabled') {
    const reactPrompt = buildReActSystemPrompt(reactFormat);
    currentSystemPrompt = reactPrompt
      ? `${reactPrompt}\n\n${currentSystemPrompt}`
      : currentSystemPrompt;
  }

  // Load relevant memories if enabled
  if (enableMemoryValue) {
    const relevantMemories = globalMemoryManager.query({
      tags: memoryTagsValue,
      limit: memoryLimitValue,
    });

    if (relevantMemories.length > 0) {
      const memoryContext = formatMemoriesAsContext(relevantMemories);
      currentSystemPrompt = `${currentSystemPrompt}\n\n## Relevant Past Context\n${memoryContext}`;
    }
  }

  // Build execution state for callbacks and stop conditions
  const getExecutionState = (): AgentExecutionState => ({
    stepCount,
    startTime,
    lastResponse: steps.length > 0 ? steps[steps.length - 1].response : undefined,
    lastToolCalls: steps.length > 0 ? steps[steps.length - 1].toolCalls : [],
    conversationHistory: steps.map(s => ({ role: 'assistant', content: s.response })),
    isRunning: true,
  });

  // Convert to stop-conditions.ts compatible state
  const getStopConditionState = (): StopConditionState => {
    const state = getExecutionState();
    return {
      stepCount: state.stepCount,
      startTime: state.startTime,
      lastResponse: state.lastResponse,
      lastToolCalls: state.lastToolCalls.map(tc => ({
        name: tc.name,
        status: tc.status,
      })),
      isRunning: state.isRunning,
      error: state.error,
    };
  };

  // Check if any stop condition is met
  const checkStopConditions = (): StopConditionResult | null => {
    const state = getExecutionState();
    const stopConditionState = getStopConditionState();

    // Check object-based stop conditions first
    for (const condition of stopConditions) {
      switch (condition.type) {
        case 'stepCount':
          if (stepCount >= condition.count) {
            return { shouldStop: true, reason: `Step count reached: ${condition.count}` };
          }
          break;
        case 'hasToolCall':
          if (state.lastToolCalls.some(tc => tc.name === condition.toolName)) {
            return { shouldStop: true, reason: `Tool called: ${condition.toolName}` };
          }
          break;
        case 'noToolCalls':
          if (stepCount > 0 && state.lastToolCalls.length === 0) {
            return { shouldStop: true, reason: 'No tool calls in last step' };
          }
          break;
        case 'custom':
          if (condition.check(state)) {
            return { shouldStop: true, reason: 'Custom condition met' };
          }
          break;
        case 'functional':
          // Use the imported checkStopCondition helper
          const result = checkStopCondition(stopConditionState, condition.condition, condition.name);
          if (result.shouldStop) {
            return result;
          }
          break;
      }
    }

    // Check functional stop conditions array
    for (const condition of functionalStopConditions) {
      const conditionName = 'conditionName' in condition
        ? (condition as FunctionalStopCondition & { conditionName: string }).conditionName
        : undefined;
      const result = checkStopCondition(stopConditionState, condition, conditionName);
      if (result.shouldStop) {
        return result;
      }
    }

    // Check default stop condition if enabled
    if (useDefaultStopCondition) {
      const defaultCondition = defaultStopCondition(maxSteps);
      const result = checkStopCondition(stopConditionState, defaultCondition, 'Default (stepCount OR noToolCalls)');
      if (result.shouldStop) {
        return result;
      }
    }

    return null;
  };

  // Parallel execution configuration
  const toolExecutionMode = config.toolExecutionMode ?? 'blocking';
  const maxConcurrentToolCalls = config.maxConcurrentToolCalls ?? 5;
  const collectPendingToolResults = config.collectPendingToolResults ?? true;
  const toolTimeout = config.toolTimeout;

  // Create tool call manager for parallel execution
  const toolCallManager = createToolCallManager({
    mode: toolExecutionMode,
    maxConcurrent: maxConcurrentToolCalls,
    defaultTimeout: toolTimeout,
    onToolStart: onToolCall,
    onToolResult: onToolResult,
    onToolError: (toolCall, error) => {
      onError?.(error);
    },
  });

  // Warn if tool count exceeds recommended threshold (Claude best practice)
  const toolCount = Object.keys(tools).length;
  if (toolCount > 20) {
    console.warn(
      `[Agent] Tool count (${toolCount}) exceeds recommended limit of 20. ` +
      `Consider using sub-agents with specialized tool sets to improve tool selection accuracy. ` +
      `See: https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them`
    );
  }

  // Convert AgentTools to AI SDK format
  const sdkTools = toolCount > 0
    ? convertToAISDKTools(tools, toolCallTracker, {
        onToolCall,
        onToolResult,
        requireApproval,
        safetyOptions: config.safetyOptions,
        retryConfig: toolRetryConfig,
        enableCache: toolCacheConfig?.enabled !== false,
        agentId,
        toolCallManager,
        executionMode: toolExecutionMode,
        toolTimeout,
      })
    : undefined;

  try {
    // Use AI SDK native multi-step execution with stopWhen
    const result = await generateText({
      model: modelInstance,
      prompt,
      system: currentSystemPrompt || undefined,
      temperature: currentTemperature,
      tools: sdkTools,
      stopWhen: stepCountIs(maxSteps),
      prepareStep: async () => {
        stepCount++;
        onStepStart?.(stepCount);

        // Check custom stop conditions
        if (stepCount > 1) {
          const stopResult = checkStopConditions();
          if (stopResult) {
            cleanupToolCalls(stopResult.reason ?? 'Agent execution stopped');
            // Call the onStopCondition callback
            onStopCondition?.(stopResult);
            // Return signal to stop (AI SDK will handle this)
            return { stop: true };
          }
        }

        // Call prepareStep callback if provided
        if (prepareStepCallback) {
          const state = getExecutionState();
          const stepConfig = await prepareStepCallback(stepCount, state);

          if (stepConfig.temperature !== undefined) {
            currentTemperature = stepConfig.temperature;
          }
          if (stepConfig.systemPrompt !== undefined) {
            currentSystemPrompt = stepConfig.systemPrompt;
          }

          return {
            temperature: currentTemperature,
            system: currentSystemPrompt,
          };
        }

        return {};
      },
      onStepFinish: (event) => {
        const stepStartTime = new Date();
        
        // Use AI SDK's event data for accurate step-to-tool-call mapping
        const stepToolCalls: ToolCall[] = [];
        
        // Map tool calls from the event to our ToolCall format
        if (event.toolCalls && event.toolCalls.length > 0) {
          for (const tc of event.toolCalls) {
            // Get args from the tool call (handle different AI SDK versions)
            const tcArgs = 'args' in tc ? tc.args : {};
            
            // Find the tracked tool call by matching name and args
            const trackedCall = Array.from(toolCallTracker.values()).find(
              (tracked) => 
                tracked.name === tc.toolName && 
                JSON.stringify(tracked.args) === JSON.stringify(tcArgs)
            );
            
            if (trackedCall) {
              stepToolCalls.push(trackedCall);
            } else {
              // Create a new entry if not found (shouldn't happen normally)
              stepToolCalls.push({
                id: tc.toolCallId,
                name: tc.toolName,
                args: (tcArgs || {}) as Record<string, unknown>,
                status: 'completed',
                startedAt: new Date(),
                completedAt: new Date(),
              });
            }
          }
        }

        // Extract usage info if available (handle different AI SDK versions)
        let usage: AgentStep['usage'] | undefined;
        if (event.usage) {
          const u = event.usage as Record<string, unknown>;
          usage = {
            promptTokens: (u.promptTokens ?? u.prompt_tokens ?? 0) as number,
            completionTokens: (u.completionTokens ?? u.completion_tokens ?? 0) as number,
            totalTokens: (u.totalTokens ?? u.total_tokens ?? 0) as number,
          };
        }

        // Parse ReAct response if enabled
        let thought: string | undefined;
        let actionDescription: string | undefined;
        let observation: string | undefined;
        
        if (enableReAct && reactFormat !== 'disabled') {
          const parsed = parseReActResponse(event.text || '', reactFormat);
          thought = parsed.thought;
          actionDescription = parsed.actionDescription;
          observation = parsed.observation;
        }

        const stepEndTime = new Date();
        
        steps.push({
          stepNumber: stepCount,
          response: event.text || '',
          toolCalls: stepToolCalls,
          timestamp: new Date(),
          finishReason: event.finishReason as AgentStep['finishReason'],
          usage,
          thought,
          actionDescription,
          observation,
        });

        // Record metrics if enabled
        if (enableMetrics && executionId) {
          globalMetricsCollector.recordStep(
            executionId,
            stepCount,
            stepStartTime,
            stepEndTime,
            stepToolCalls,
            event.finishReason as string
          );
          
          if (usage) {
            globalMetricsCollector.recordTokenUsage(
              executionId,
              stepCount,
              usage.promptTokens,
              usage.completionTokens
            );
          }
        }

        onStepComplete?.(stepCount, event.text || '', stepToolCalls);

        // Dispatch agent step hook
        getPluginLifecycleHooks().dispatchOnAgentStep(agentId, {
          stepNumber: stepCount,
          type: stepToolCalls.length > 0 ? 'tool_call' : 'response',
          content: event.text || '',
          tool: stepToolCalls[0]?.name,
          toolArgs: stepToolCalls[0]?.args,
        });
      },
    });

    const duration = Date.now() - startTime.getTime();

    // Extract tool results from steps
    const allToolResults: Array<{ toolCallId: string; toolName: string; result: unknown }> = [];
    if (result.steps) {
      for (const step of result.steps) {
        if (step.toolResults) {
          for (const tr of step.toolResults) {
            allToolResults.push({
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              result: 'result' in tr ? tr.result : undefined,
            });
          }
        }
      }
    }

    // Handle pending tool results if configured
    let pendingToolCalls: ToolCall[] | undefined;
    if (collectPendingToolResults && toolCallManager.hasPending()) {
      const flushResult = await toolCallManager.flushPending();
      // Mark any still-pending calls
      pendingToolCalls = toolCallManager.getPendingResults()
        .filter(p => p.status === 'pending' || p.status === 'running')
        .map(p => {
          const tc = toolCallTracker.get(p.toolCallId);
          return tc || {
            id: p.toolCallId,
            name: 'unknown',
            args: {},
            status: p.status as ToolCall['status'],
            startedAt: p.startedAt,
          };
        });
      
      // Log flush results for debugging
      if (flushResult.failed.length > 0) {
        console.warn(`[Agent] ${flushResult.failed.length} tool calls failed during flush`);
      }
    } else if (!collectPendingToolResults) {
      // Collect pending calls without waiting
      pendingToolCalls = toolCallManager.getPendingResults()
        .filter(p => p.status === 'pending' || p.status === 'running')
        .map(p => {
          const tc = toolCallTracker.get(p.toolCallId);
          return tc || {
            id: p.toolCallId,
            name: 'unknown',
            args: {},
            status: p.status as ToolCall['status'],
            startedAt: p.startedAt,
          };
        });
    }

    // Calculate tool execution statistics
    const allToolCalls: ToolCall[] = steps.flatMap(s => s.toolCalls);
    const completedCalls = allToolCalls.filter(tc => tc.status === 'completed');
    const failedCalls = allToolCalls.filter(tc => tc.status === 'error' || tc.status === 'timeout');
    const avgDuration = completedCalls.length > 0
      ? completedCalls.reduce((sum, tc) => sum + (tc.duration || 0), 0) / completedCalls.length
      : 0;

    const toolExecutionStats = {
      total: allToolCalls.length,
      completed: completedCalls.length,
      failed: failedCalls.length,
      pending: pendingToolCalls?.length || 0,
      avgDuration,
    };

    const agentResult: AgentResult = {
      success: true,
      finalResponse: result.text,
      steps,
      totalSteps: stepCount,
      duration,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      pendingToolCalls: pendingToolCalls && pendingToolCalls.length > 0 ? pendingToolCalls : undefined,
      toolExecutionStats,
    };

    // End observability tracking
    if (observabilityManager) {
      const allToolCalls: ToolCall[] = steps.flatMap(s => s.toolCalls);
      observabilityManager.endAgentExecution(result.text, allToolCalls);
    }

    // Persist to memory if enabled
    if (enableMemoryValue && persistToMemoryValue && agentResult.success) {
      const memoryKey = `execution:${Date.now()}`;
      globalMemoryManager.set(memoryKey, {
        prompt: prompt.slice(0, 500),
        response: agentResult.finalResponse.slice(0, 1000),
        toolsUsed: agentResult.toolResults?.map(t => t.toolName) || [],
        duration: agentResult.duration,
        stepCount: agentResult.totalSteps,
      }, {
        tags: [...memoryTagsValue, 'agent-execution'],
        metadata: {
          sessionId,
          provider,
          model,
        },
      });
    }

    // Call onFinish callback
    onFinish?.(agentResult);

    // Dispatch agent complete hook
    getPluginLifecycleHooks().dispatchOnAgentComplete(agentId, agentResult);

    return agentResult;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Agent execution failed');
    cleanupToolCalls(err.message);

    // Dispatch agent error hook
    getPluginLifecycleHooks().dispatchOnAgentError(agentId, err);

    onError?.(err);

    // End observability tracking on error
    if (observabilityManager) {
      const allToolCalls: ToolCall[] = steps.flatMap(s => s.toolCalls);
      observabilityManager.endAgentExecution(`Error: ${err.message}`, allToolCalls);
    }

    // End metrics collection on error if enabled
    if (enableMetrics && executionId) {
      globalMetricsCollector.endExecution(executionId, 'error');
    }

    return {
      success: false,
      finalResponse: '',
      steps,
      totalSteps: stepCount,
      duration: Date.now() - startTime.getTime(),
      error: err.message,
    };
  }
}

/**
 * Create a simple agent with predefined tools
 */
export function createAgent(initialConfig: Omit<AgentConfig, 'provider' | 'model' | 'apiKey'>) {
  // Create mutable config copy
  const config: Partial<AgentConfig> = { ...initialConfig };
  
  return {
    run: async (
      prompt: string,
      providerConfig: { provider: ProviderName; model: string; apiKey: string; baseURL?: string }
    ) => {
      return executeAgent(prompt, {
        ...config,
        ...providerConfig,
      } as AgentConfig);
    },
    addTool: (name: string, agentTool: AgentTool) => {
      config.tools = config.tools || {};
      config.tools[name] = agentTool;
    },
    removeTool: (name: string) => {
      if (config.tools) {
        delete config.tools[name];
      }
    },
    addStopCondition: (condition: StopCondition) => {
      config.stopConditions = config.stopConditions || [];
      config.stopConditions.push(condition);
    },
    clearStopConditions: () => {
      config.stopConditions = [];
    },
  };
}

/**
 * Helper to create common stop conditions
 */
export const stopConditions = {
  afterSteps: (count: number): StopCondition => ({ type: 'stepCount', count }),
  whenToolCalled: (toolName: string): StopCondition => ({ type: 'hasToolCall', toolName }),
  whenNoToolsCalled: (): StopCondition => ({ type: 'noToolCalls' }),
  custom: (check: (state: AgentExecutionState) => boolean): StopCondition => ({ type: 'custom', check }),
  /** Wrap a functional stop condition from stop-conditions.ts */
  functional: (condition: FunctionalStopCondition, name?: string): StopCondition => ({
    type: 'functional',
    condition,
    name,
  }),
};

// Re-export functional stop condition builders
export {
  functionalStepCountIs,
  durationExceeds,
  functionalNoToolCalls,
  toolCalled,
  responseContains,
  allToolsSucceeded,
  anyToolFailed,
  allOf,
  anyOf,
  not,
  namedCondition,
};

// Re-export types for functional stop conditions
export type { FunctionalStopCondition, StopConditionResult };
