/**
 * Agent Executor - Execute multi-step agent tasks with tool calling
 * Simplified implementation that works with AI SDK 5.x
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { getProviderModel, type ProviderName } from '../client';
import { type StopCondition, defaultStopCondition } from './stop-conditions';

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

export interface AgentConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  systemPrompt?: string;
  temperature?: number;
  maxSteps?: number;
  tools?: Record<string, AgentTool>;
  stopCondition?: StopCondition;
  onStepStart?: (step: number) => void;
  onStepComplete?: (step: number, response: string, toolCalls: ToolCall[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolCall: ToolCall) => void;
  onError?: (error: Error) => void;
  requireApproval?: (toolCall: ToolCall) => Promise<boolean>;
}

export interface AgentResult {
  success: boolean;
  finalResponse: string;
  steps: AgentStep[];
  totalSteps: number;
  duration: number;
  error?: string;
}

export interface AgentStep {
  stepNumber: number;
  response: string;
  toolCalls: ToolCall[];
  timestamp: Date;
}

/**
 * Build tool description for system prompt
 */
function buildToolsDescription(tools: Record<string, AgentTool>): string {
  if (Object.keys(tools).length === 0) return '';

  const toolDescriptions = Object.entries(tools).map(([name, tool]) => {
    return `- ${name}: ${tool.description}`;
  }).join('\n');

  return `\n\nYou have access to the following tools:\n${toolDescriptions}\n\nTo use a tool, respond with a JSON object in this format:\n{"tool": "tool_name", "args": {...}}\n\nIf you don't need to use a tool, respond normally.`;
}

/**
 * Parse tool call from response
 */
function parseToolCall(response: string): { tool: string; args: Record<string, unknown> } | null {
  try {
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*"tool"[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.tool && typeof parsed.tool === 'string') {
      return {
        tool: parsed.tool,
        args: parsed.args || {},
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Execute an agent task with multi-step tool calling
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
    tools = {},
    stopCondition = defaultStopCondition(maxSteps),
    onStepStart,
    onStepComplete,
    onToolCall,
    onToolResult,
    onError,
    requireApproval,
  } = config;

  const modelInstance = getProviderModel(provider, model, apiKey, baseURL);
  const startTime = new Date();
  const steps: AgentStep[] = [];

  // Build enhanced system prompt with tool descriptions
  const enhancedSystemPrompt = systemPrompt + buildToolsDescription(tools);

  // Initialize state
  const state: AgentExecutionState = {
    stepCount: 0,
    startTime,
    lastToolCalls: [],
    conversationHistory: [{ role: 'user', content: prompt }],
    isRunning: true,
  };

  try {
    while (state.isRunning && !stopCondition(state)) {
      state.stepCount++;
      onStepStart?.(state.stepCount);

      // Build messages for this step
      const messages = state.conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Generate response
      const result = await generateText({
        model: modelInstance,
        messages,
        system: enhancedSystemPrompt,
        temperature,
      });

      state.lastResponse = result.text;
      state.lastToolCalls = [];

      // Check if response contains a tool call
      const toolCallParsed = parseToolCall(result.text);

      if (toolCallParsed && tools[toolCallParsed.tool]) {
        const toolDef = tools[toolCallParsed.tool];
        const toolCall: ToolCall = {
          id: `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: toolCallParsed.tool,
          args: toolCallParsed.args,
          status: 'pending',
        };

        state.lastToolCalls.push(toolCall);
        onToolCall?.(toolCall);

        // Check if approval is required
        if (toolDef.requiresApproval && requireApproval) {
          const approved = await requireApproval(toolCall);
          if (!approved) {
            toolCall.status = 'error';
            toolCall.error = 'Tool call rejected by user';
            state.conversationHistory.push({
              role: 'assistant',
              content: result.text,
            });
            state.conversationHistory.push({
              role: 'user',
              content: `Tool call rejected. Please try a different approach.`,
            });
            continue;
          }
        }

        // Execute tool
        toolCall.status = 'running';
        toolCall.startedAt = new Date();

        try {
          const toolResult = await toolDef.execute(toolCallParsed.args);
          toolCall.status = 'completed';
          toolCall.result = toolResult;
          toolCall.completedAt = new Date();

          // Add to conversation
          state.conversationHistory.push({
            role: 'assistant',
            content: result.text,
          });
          state.conversationHistory.push({
            role: 'user',
            content: `Tool result for ${toolCallParsed.tool}:\n${JSON.stringify(toolResult, null, 2)}`,
          });
        } catch (error) {
          toolCall.status = 'error';
          toolCall.error = error instanceof Error ? error.message : 'Tool execution failed';
          toolCall.completedAt = new Date();

          state.conversationHistory.push({
            role: 'assistant',
            content: result.text,
          });
          state.conversationHistory.push({
            role: 'user',
            content: `Tool error for ${toolCallParsed.tool}: ${toolCall.error}`,
          });
        }

        onToolResult?.(toolCall);
      } else {
        // No tool call, add response and potentially finish
        state.conversationHistory.push({
          role: 'assistant',
          content: result.text,
        });

        // If no tool calls, we're likely done
        if (result.text && !toolCallParsed) {
          state.isRunning = false;
        }
      }

      // Record step
      steps.push({
        stepNumber: state.stepCount,
        response: result.text,
        toolCalls: [...state.lastToolCalls],
        timestamp: new Date(),
      });

      onStepComplete?.(state.stepCount, result.text, state.lastToolCalls);

      // Check stop condition
      if (stopCondition(state)) {
        state.isRunning = false;
      }
    }

    const duration = Date.now() - startTime.getTime();

    return {
      success: true,
      finalResponse: state.lastResponse || '',
      steps,
      totalSteps: state.stepCount,
      duration,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Agent execution failed');
    onError?.(err);

    return {
      success: false,
      finalResponse: '',
      steps,
      totalSteps: state.stepCount,
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
  };
}
