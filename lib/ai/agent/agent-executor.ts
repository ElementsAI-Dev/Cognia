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
import { getProviderModel, type ProviderName } from '../client';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
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
  | { type: 'custom'; check: (state: AgentExecutionState) => boolean };

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
  tools?: Record<string, AgentTool>;
  onStepStart?: (step: number) => void;
  onStepComplete?: (step: number, response: string, toolCalls: ToolCall[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolCall: ToolCall) => void;
  onError?: (error: Error) => void;
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>;
  prepareStep?: (step: number, state: AgentExecutionState) => PrepareStepResult | Promise<PrepareStepResult>;
  onFinish?: (result: AgentResult) => void;
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
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>
) {
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
      };

      toolCallTracker.set(toolCallId, toolCall);
      onToolCall?.(toolCall);

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
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>
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
      requireApproval
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
    tools = {},
    onStepStart,
    onStepComplete,
    onToolCall,
    onToolResult,
    onError,
    requireApproval,
    prepareStep: prepareStepCallback,
    onFinish,
  } = config;

  const modelInstance = getProviderModel(provider, model, apiKey, baseURL);
  const startTime = new Date();
  const steps: AgentStep[] = [];
  const toolCallTracker = new Map<string, ToolCall>();

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

  // Check if any stop condition is met
  const checkStopConditions = (): boolean => {
    const state = getExecutionState();
    
    for (const condition of stopConditions) {
      switch (condition.type) {
        case 'stepCount':
          if (stepCount >= condition.count) return true;
          break;
        case 'hasToolCall':
          if (state.lastToolCalls.some(tc => tc.name === condition.toolName)) return true;
          break;
        case 'noToolCalls':
          if (stepCount > 0 && state.lastToolCalls.length === 0) return true;
          break;
        case 'custom':
          if (condition.check(state)) return true;
          break;
      }
    }
    return false;
  };

  // Convert AgentTools to AI SDK format
  const sdkTools = Object.keys(tools).length > 0
    ? convertToAISDKTools(
        tools,
        toolCallTracker,
        onToolCall,
        onToolResult,
        requireApproval
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
        if (stepCount > 1 && checkStopConditions()) {
          // Return signal to stop (AI SDK will handle this)
          return { stop: true };
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

    // Call onFinish callback
    onFinish?.(agentResult);

    return agentResult;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Agent execution failed');
    onError?.(err);

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
};
