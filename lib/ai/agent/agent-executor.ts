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
import { isMcpTool, extractMcpServerInfo } from './mcp-tools';
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

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  /** MCP server ID if this is an MCP tool call */
  mcpServerId?: string;
  /** MCP server display name */
  mcpServerName?: string;
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
  systemPrompt?: string;
  temperature?: number;
  maxSteps?: number;
  stopConditions?: StopCondition[];
  /** Functional stop conditions from stop-conditions.ts API */
  functionalStopConditions?: FunctionalStopCondition[];
  /** Use default stop condition (stepCount OR noToolCalls) */
  useDefaultStopCondition?: boolean;
  tools?: Record<string, AgentTool>;
  onStepStart?: (step: number) => void;
  onStepComplete?: (step: number, response: string, toolCalls: ToolCall[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolCall: ToolCall) => void;
  onError?: (error: Error) => void;
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>;
  prepareStep?: (step: number, state: AgentExecutionState) => PrepareStepResult | Promise<PrepareStepResult>;
  onFinish?: (result: AgentResult) => void;
  /** Callback when stop condition is triggered */
  onStopCondition?: (result: StopConditionResult) => void;
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
}

export interface AgentResult {
  success: boolean;
  finalResponse: string;
  steps: AgentStep[];
  totalSteps: number;
  duration: number;
  toolResults?: Array<{ toolCallId: string; toolName: string; result: unknown }>;
  error?: string;
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
}

/**
 * Create an AI SDK compatible tool object from an AgentTool definition
 * This builds the tool object manually to avoid complex type issues with the tool() helper
 */
function createSDKTool(
  name: string,
  agentTool: AgentTool,
  toolCallTracker: Map<string, ToolCall>,
  onToolCall?: (toolCall: ToolCall) => void,
  onToolResult?: (toolCall: ToolCall) => void,
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>,
  safetyOptions?: SafetyCheckOptions
) {
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
      };

      toolCallTracker.set(toolCallId, toolCall);
      onToolCall?.(toolCall);

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

      try {
        const result = await agentTool.execute(args as Record<string, unknown>);
        toolCall.status = 'completed';
        toolCall.result = result;
        toolCall.completedAt = new Date();
        onToolResult?.(toolCall);
        return result;
      } catch (error) {
        toolCall.status = 'error';
        toolCall.error = error instanceof Error ? error.message : 'Tool execution failed';
        toolCall.completedAt = new Date();
        onToolResult?.(toolCall);
        throw error;
      }
    },
  };
}

/**
 * Convert AgentTool record to AI SDK tools format
 */
function convertToAISDKTools(
  tools: Record<string, AgentTool>,
  toolCallTracker: Map<string, ToolCall>,
  onToolCall?: (toolCall: ToolCall) => void,
  onToolResult?: (toolCall: ToolCall) => void,
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>,
  safetyOptions?: SafetyCheckOptions
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdkTools: Record<string, any> = {};

  for (const [name, agentTool] of Object.entries(tools)) {
    sdkTools[name] = createSDKTool(
      name,
      agentTool,
      toolCallTracker,
      onToolCall,
      onToolResult,
      requireApproval,
      safetyOptions
    );
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
  } = config;

  // Initialize observability manager if enabled
  let observabilityManager: AgentObservabilityManager | null = null;
  if (enableObservability && sessionId) {
    observabilityManager = createAgentObservabilityManager({
      sessionId,
      userId,
      agentName,
      task: prompt,
      enableLangfuse: true,
      enableOpenTelemetry: true,
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

  // Convert AgentTools to AI SDK format
  const sdkTools = Object.keys(tools).length > 0
    ? convertToAISDKTools(
        tools,
        toolCallTracker,
        onToolCall,
        onToolResult,
        requireApproval,
        config.safetyOptions
      )
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

        steps.push({
          stepNumber: stepCount,
          response: event.text || '',
          toolCalls: stepToolCalls,
          timestamp: new Date(),
          finishReason: event.finishReason as AgentStep['finishReason'],
          usage,
        });

        onStepComplete?.(stepCount, event.text || '', stepToolCalls);
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

    const agentResult: AgentResult = {
      success: true,
      finalResponse: result.text,
      steps,
      totalSteps: stepCount,
      duration,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
    };

    // End observability tracking
    if (observabilityManager) {
      const allToolCalls: ToolCall[] = steps.flatMap(s => s.toolCalls);
      observabilityManager.endAgentExecution(result.text, allToolCalls);
    }

    // Call onFinish callback
    onFinish?.(agentResult);

    return agentResult;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Agent execution failed');
    cleanupToolCalls(err.message);
    onError?.(err);

    // End observability tracking on error
    if (observabilityManager) {
      const allToolCalls: ToolCall[] = steps.flatMap(s => s.toolCalls);
      observabilityManager.endAgentExecution(`Error: ${err.message}`, allToolCalls);
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
export function createAgent(config: Omit<AgentConfig, 'provider' | 'model' | 'apiKey'>) {
  return {
    run: async (
      prompt: string,
      providerConfig: { provider: ProviderName; model: string; apiKey: string; baseURL?: string }
    ) => {
      return executeAgent(prompt, {
        ...config,
        ...providerConfig,
      });
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

// Re-export functional stop condition builders for convenience
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
