/**
 * Protocol Translators
 *
 * Translates between Cognia's internal agent/tool formats and external agent protocols.
 * Provides bidirectional conversion for messages, tool calls, and results.
 */

import { z } from 'zod';
import type { AgentTool, ToolCall } from '@/lib/ai/agent';
import type {
  ExternalAgentMessage,
  ExternalAgentContent,
  ExternalAgentTextContent,
  ExternalAgentToolUseContent,
  ExternalAgentToolResultContent,
  ExternalAgentEvent,
  ExternalAgentResult,
  ExternalAgentStep,
  AcpToolInfo,
  AcpPermissionRequest,
  ExternalAgentTokenUsage,
} from '@/types/agent/external-agent';
import type { SubAgentResult, SubAgentTokenUsage } from '@/types/agent/sub-agent';

// ============================================================================
// Message Translators
// ============================================================================

/**
 * Convert a simple text prompt to ExternalAgentMessage
 */
export function textToExternalMessage(
  text: string,
  role: 'user' | 'assistant' | 'system' = 'user'
): ExternalAgentMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role,
    content: [{ type: 'text', text }],
    timestamp: new Date(),
  };
}

/**
 * Convert ExternalAgentMessage to simple text
 */
export function externalMessageToText(message: ExternalAgentMessage): string {
  return message.content
    .filter((c): c is ExternalAgentTextContent => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

/**
 * Extract tool uses from ExternalAgentMessage
 */
export function extractToolUses(
  message: ExternalAgentMessage
): ExternalAgentToolUseContent[] {
  return message.content.filter(
    (c): c is ExternalAgentToolUseContent => c.type === 'tool_use'
  );
}

/**
 * Extract tool results from ExternalAgentMessage
 */
export function extractToolResults(
  message: ExternalAgentMessage
): ExternalAgentToolResultContent[] {
  return message.content.filter(
    (c): c is ExternalAgentToolResultContent => c.type === 'tool_result'
  );
}

// ============================================================================
// Tool Translators
// ============================================================================

/**
 * Convert AcpToolInfo to Cognia's AgentTool format
 *
 * This creates an AgentTool that delegates execution to the external agent.
 * The actual execution happens via the external agent's tool execution flow.
 */
export function acpToolToAgentTool(
  tool: AcpToolInfo,
  executeCallback: (toolId: string, name: string, input: Record<string, unknown>) => Promise<string>
): AgentTool {
  // Convert JSON Schema parameters to Zod schema (simplified)
  const parametersSchema = jsonSchemaToZod(tool.parameters || {});

  return {
    name: tool.name,
    description: tool.description || `External tool: ${tool.name}`,
    parameters: parametersSchema,
    execute: async (args: Record<string, unknown>) => {
      return executeCallback(tool.id, tool.name, args);
    },
    requiresApproval: tool.requiresPermission,
  };
}

/**
 * Convert multiple AcpToolInfo to AgentTool map
 */
export function acpToolsToAgentTools(
  tools: AcpToolInfo[],
  executeCallback: (toolId: string, name: string, input: Record<string, unknown>) => Promise<string>
): Record<string, AgentTool> {
  const result: Record<string, AgentTool> = {};

  for (const tool of tools) {
    // Prefix with 'external_' to avoid name conflicts
    const toolName = `external_${tool.name}`;
    result[toolName] = acpToolToAgentTool(tool, executeCallback);
  }

  return result;
}

/**
 * Convert Cognia ToolCall to external agent format
 */
export function toolCallToExternal(toolCall: ToolCall): ExternalAgentToolUseContent {
  return {
    type: 'tool_use',
    id: toolCall.id,
    name: toolCall.name,
    input: toolCall.args as Record<string, unknown>,
    status: toolCall.status === 'completed' ? 'completed' : toolCall.status === 'error' ? 'error' : 'pending',
  };
}

/**
 * Convert external tool use to Cognia ToolCall
 */
export function externalToolUseToToolCall(
  toolUse: ExternalAgentToolUseContent
): ToolCall {
  return {
    id: toolUse.id,
    name: toolUse.name,
    args: toolUse.input,
    status: toolUse.status === 'completed' ? 'completed' : toolUse.status === 'error' ? 'error' : 'pending',
  };
}

/**
 * Simple JSON Schema to Zod converter
 * This is a basic implementation - for production, use a full converter library
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const properties = (schema.properties as Record<string, Record<string, unknown>>) || {};
  const required = (schema.required as string[]) || [];

  const zodShape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    let zodType: z.ZodTypeAny;

    switch (prop.type) {
      case 'string':
        zodType = z.string();
        if (prop.enum) {
          zodType = z.enum(prop.enum as [string, ...string[]]);
        }
        break;
      case 'number':
      case 'integer':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array':
        zodType = z.array(z.unknown());
        break;
      case 'object':
        zodType = z.record(z.unknown());
        break;
      default:
        zodType = z.unknown();
    }

    // Add description if present
    if (prop.description) {
      zodType = zodType.describe(prop.description as string);
    }

    // Make optional if not required
    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    zodShape[key] = zodType;
  }

  return z.object(zodShape);
}

// ============================================================================
// Result Translators
// ============================================================================

/**
 * Convert ExternalAgentResult to SubAgentResult
 */
export function externalResultToSubAgentResult(
  externalResult: ExternalAgentResult,
  _subAgentId: string
): SubAgentResult {
  return {
    success: externalResult.success,
    finalResponse: externalResult.finalResponse,
    steps: externalResult.steps.map((step, idx) => ({
      stepNumber: idx + 1,
      response: step.content?.find((c) => c.type === 'text')?.text || '',
      toolCalls: step.toolCall ? [{
        id: step.toolCall.id,
        name: step.toolCall.name,
        args: step.toolCall.input,
        status: 'completed' as const,
      }] : [],
      timestamp: step.startedAt || new Date(),
      duration: step.duration,
    })),
    totalSteps: externalResult.steps.length,
    duration: externalResult.duration,
    toolResults: externalResult.toolCalls.map((tc) => ({
      toolCallId: tc.id,
      toolName: tc.name,
      result: tc.result,
    })),
    output: externalResult.output,
    tokenUsage: externalResult.tokenUsage
      ? externalTokenUsageToSubAgent(externalResult.tokenUsage)
      : undefined,
    error: externalResult.error,
  };
}

/**
 * Convert external token usage to SubAgent format
 */
export function externalTokenUsageToSubAgent(
  usage: ExternalAgentTokenUsage
): SubAgentTokenUsage {
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
  };
}

/**
 * Convert SubAgentResult to ExternalAgentResult
 */
export function subAgentResultToExternal(
  subAgentResult: SubAgentResult,
  sessionId: string
): ExternalAgentResult {
  return {
    success: subAgentResult.success,
    sessionId,
    finalResponse: subAgentResult.finalResponse || '',
    messages: [],
    steps: [],
    toolCalls: subAgentResult.toolResults?.map((tr) => ({
      id: tr.toolCallId,
      name: tr.toolName,
      input: {} as Record<string, unknown>,
      result: tr.result as string | Record<string, unknown>,
      status: 'completed' as const,
    })) || [],
    duration: subAgentResult.duration || 0,
    tokenUsage: subAgentResult.tokenUsage
      ? {
          promptTokens: subAgentResult.tokenUsage.promptTokens,
          completionTokens: subAgentResult.tokenUsage.completionTokens,
          totalTokens: subAgentResult.tokenUsage.totalTokens,
        }
      : undefined,
    output: subAgentResult.output,
    error: subAgentResult.error,
  };
}

// ============================================================================
// Event Translators
// ============================================================================

/**
 * Extract final response text from a sequence of events
 */
export function extractResponseFromEvents(events: ExternalAgentEvent[]): string {
  let response = '';

  for (const event of events) {
    if (event.type === 'message_delta' && event.delta.type === 'text') {
      response += event.delta.text;
    }
  }

  return response;
}

/**
 * Extract thinking content from events
 */
export function extractThinkingFromEvents(events: ExternalAgentEvent[]): string {
  let thinking = '';

  for (const event of events) {
    if (event.type === 'thinking') {
      thinking += event.thinking;
    } else if (event.type === 'message_delta' && event.delta.type === 'thinking') {
      thinking += event.delta.text;
    }
  }

  return thinking;
}

/**
 * Extract tool calls from events
 */
export function extractToolCallsFromEvents(
  events: ExternalAgentEvent[]
): Array<{ id: string; name: string; input: Record<string, unknown>; result?: string | Record<string, unknown>; isError?: boolean }> {
  const toolCalls: Map<string, { id: string; name: string; input: Record<string, unknown>; result?: string | Record<string, unknown>; isError?: boolean }> = new Map();

  for (const event of events) {
    if (event.type === 'tool_use_start') {
      toolCalls.set(event.toolUseId, {
        id: event.toolUseId,
        name: event.toolName,
        input: {},
      });
    } else if (event.type === 'tool_use_end') {
      const tc = toolCalls.get(event.toolUseId);
      if (tc) {
        tc.input = event.input;
      }
    } else if (event.type === 'tool_result') {
      const tc = toolCalls.get(event.toolUseId);
      if (tc) {
        tc.result = event.result;
        tc.isError = event.isError;
      }
    }
  }

  return Array.from(toolCalls.values());
}

/**
 * Convert events to execution steps
 */
export function eventsToSteps(events: ExternalAgentEvent[]): ExternalAgentStep[] {
  const steps: ExternalAgentStep[] = [];
  let stepNumber = 0;
  let currentStep: ExternalAgentStep | null = null;

  for (const event of events) {
    switch (event.type) {
      case 'message_start':
        stepNumber++;
        currentStep = {
          id: `step_${stepNumber}`,
          stepNumber,
          type: 'message',
          status: 'running',
          content: [],
          startedAt: event.timestamp,
        };
        steps.push(currentStep);
        break;

      case 'message_delta':
        if (currentStep && currentStep.type === 'message') {
          const existingText = currentStep.content?.find((c) => c.type === 'text') as ExternalAgentTextContent | undefined;
          if (existingText) {
            existingText.text += event.delta.text;
          } else {
            currentStep.content = currentStep.content || [];
            currentStep.content.push({ type: 'text', text: event.delta.text });
          }
        }
        break;

      case 'message_end':
        if (currentStep) {
          currentStep.status = 'completed';
          currentStep.completedAt = event.timestamp;
          if (currentStep.startedAt) {
            currentStep.duration = event.timestamp.getTime() - currentStep.startedAt.getTime();
          }
        }
        break;

      case 'tool_use_start':
        stepNumber++;
        currentStep = {
          id: `step_${stepNumber}`,
          stepNumber,
          type: 'tool_call',
          status: 'running',
          toolCall: {
            id: event.toolUseId,
            name: event.toolName,
            input: {},
          },
          startedAt: event.timestamp,
        };
        steps.push(currentStep);
        break;

      case 'tool_use_end':
        if (currentStep && currentStep.type === 'tool_call' && currentStep.toolCall) {
          currentStep.toolCall.input = event.input;
        }
        break;

      case 'tool_result':
        if (currentStep && currentStep.type === 'tool_call') {
          currentStep.toolResult = {
            toolCallId: event.toolUseId,
            result: event.result,
            isError: event.isError,
          };
          currentStep.status = event.isError ? 'failed' : 'completed';
          currentStep.completedAt = event.timestamp;
          if (currentStep.startedAt) {
            currentStep.duration = event.timestamp.getTime() - currentStep.startedAt.getTime();
          }
        }
        break;

      case 'thinking':
        stepNumber++;
        steps.push({
          id: `step_${stepNumber}`,
          stepNumber,
          type: 'thinking',
          status: 'completed',
          content: [{ type: 'thinking', thinking: event.thinking }],
          startedAt: event.timestamp,
          completedAt: event.timestamp,
        });
        break;

      case 'error':
        if (currentStep) {
          currentStep.status = 'failed';
          currentStep.error = event.error;
          currentStep.completedAt = event.timestamp;
        }
        break;
    }
  }

  return steps;
}

// ============================================================================
// Permission Translators
// ============================================================================

/**
 * Convert AcpPermissionRequest to a user-friendly format for UI display
 */
export function formatPermissionRequest(request: AcpPermissionRequest): {
  title: string;
  description: string;
  riskLevel: string;
  toolName: string;
  toolDescription?: string;
} {
  const riskLabels: Record<string, string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  };

  return {
    title: `Permission Required: ${request.toolInfo.name}`,
    description: request.reason || `The agent wants to use the "${request.toolInfo.name}" tool.`,
    riskLevel: riskLabels[request.riskLevel || 'medium'] || 'Unknown Risk',
    toolName: request.toolInfo.name,
    toolDescription: request.toolInfo.description,
  };
}

// ============================================================================
// Content Helpers
// ============================================================================

/**
 * Create a text content block
 */
export function createTextContent(text: string): ExternalAgentTextContent {
  return { type: 'text', text };
}

/**
 * Create a tool use content block
 */
export function createToolUseContent(
  id: string,
  name: string,
  input: Record<string, unknown>
): ExternalAgentToolUseContent {
  return { type: 'tool_use', id, name, input, status: 'pending' };
}

/**
 * Create a tool result content block
 */
export function createToolResultContent(
  toolUseId: string,
  content: string | Record<string, unknown>,
  isError = false
): ExternalAgentToolResultContent {
  return { type: 'tool_result', toolUseId, content, isError };
}

/**
 * Check if content array contains tool use
 */
export function hasToolUse(content: ExternalAgentContent[]): boolean {
  return content.some((c) => c.type === 'tool_use');
}

/**
 * Check if content array contains tool result
 */
export function hasToolResult(content: ExternalAgentContent[]): boolean {
  return content.some((c) => c.type === 'tool_result');
}

/**
 * Get the primary text from content array
 */
export function getPrimaryText(content: ExternalAgentContent[]): string {
  const textContent = content.find((c): c is ExternalAgentTextContent => c.type === 'text');
  return textContent?.text || '';
}

// ============================================================================
// ACP Tool Call Content Helpers
// @see https://agentclientprotocol.com/protocol/tool-calls
// ============================================================================

/**
 * Extract text from ACP tool call content array (handles union type)
 */
export function extractToolCallContentText(
  content: Array<{ type: string; content?: { text?: string }; path?: string; terminalId?: string }>
): string {
  if (!content?.length) return '';

  return content
    .map((item) => {
      if (item.type === 'content' && item.content?.text) {
        return item.content.text;
      }
      if (item.type === 'diff' && item.path) {
        return `[Diff: ${item.path}]`;
      }
      if (item.type === 'terminal' && item.terminalId) {
        return `[Terminal: ${item.terminalId}]`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Check if tool call content contains a diff
 */
export function hasDiffContent(
  content?: Array<{ type: string }>
): boolean {
  return content?.some((item) => item.type === 'diff') ?? false;
}

/**
 * Check if tool call content contains a terminal
 */
export function hasTerminalContent(
  content?: Array<{ type: string }>
): boolean {
  return content?.some((item) => item.type === 'terminal') ?? false;
}

/**
 * Extract diff entries from tool call content
 */
export function extractDiffs(
  content?: Array<{ type: string; path?: string; oldText?: string | null; newText?: string }>
): Array<{ path: string; oldText: string | null; newText: string }> {
  if (!content) return [];
  return content
    .filter((item) => item.type === 'diff' && item.path && item.newText !== undefined)
    .map((item) => ({
      path: item.path!,
      oldText: item.oldText ?? null,
      newText: item.newText!,
    }));
}

/**
 * Extract file locations from tool call update
 */
export function extractLocations(
  locations?: Array<{ path: string; line?: number }>
): Array<{ path: string; line?: number }> {
  return locations || [];
}
