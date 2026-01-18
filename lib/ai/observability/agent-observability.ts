/**
 * Observability Integration for Agents
 * 
 * Integrates Langfuse and OpenTelemetry into the agent system
 * to provide comprehensive observability for agent executions.
 */

import {
  createChatTrace,
  createSpanWithErrorHandling,
} from './langfuse-client';
import {
  OpenTelemetryUtils,
  AISpanAttributes,
} from './tracing';
import type { ToolCall } from '../agent/agent-executor';

/**
 * Agent observability configuration
 */
export interface AgentObservabilityConfig {
  /** Enable Langfuse tracking */
  enableLangfuse?: boolean;
  /** Enable OpenTelemetry tracing */
  enableOpenTelemetry?: boolean;
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId?: string;
  /** Agent name */
  agentName: string;
  /** Task description */
  task?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent observability manager
 */
export class AgentObservabilityManager {
  private sessionId: string;
  private userId?: string;
  private agentName: string;
  private task?: string;
  private metadata?: Record<string, unknown>;
  private langfuseTrace: ReturnType<typeof createChatTrace> | null = null;
  private enableLangfuse: boolean;
  private enableOpenTelemetry: boolean;

  constructor(config: AgentObservabilityConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.agentName = config.agentName;
    this.task = config.task;
    this.metadata = config.metadata;
    this.enableLangfuse = config.enableLangfuse ?? true;
    this.enableOpenTelemetry = config.enableOpenTelemetry ?? true;
  }

  /**
   * Start agent execution
   */
  startAgentExecution() {
    if (this.enableLangfuse) {
      this.langfuseTrace = createChatTrace({
        sessionId: this.sessionId,
        userId: this.userId,
        tags: ['agent', this.agentName],
        metadata: {
          agentName: this.agentName,
          task: this.task,
          ...this.metadata,
        },
      });
    }
  }

  /**
   * Track agent execution
   */
  async trackAgentExecution<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return OpenTelemetryUtils.trackAgentExecution(
      this.agentName,
      fn,
      {
        sessionId: this.sessionId,
        userId: this.userId,
        attributes: {
          [AISpanAttributes.AGENT_NAME]: this.agentName,
          [AISpanAttributes.SESSION_ID]: this.sessionId,
          [AISpanAttributes.USER_ID]: this.userId,
          task: this.task,
          ...this.metadata,
        },
      }
    );
  }

  /**
   * Track a tool call
   */
  async trackToolCall<T>(
    toolName: string,
    args: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    const result = await OpenTelemetryUtils.trackToolCall(
      toolName,
      fn,
      {
        attributes: {
          [AISpanAttributes.TOOL_NAME]: toolName,
          toolArgs: JSON.stringify(args),
          [AISpanAttributes.AGENT_NAME]: this.agentName,
          [AISpanAttributes.SESSION_ID]: this.sessionId,
        },
      }
    );

    if (this.enableLangfuse && this.langfuseTrace) {
      await createSpanWithErrorHandling(
        this.langfuseTrace,
        {
          name: `tool:${toolName}`,
          input: args,
          output: result,
          metadata: {
            toolName,
          },
        },
        async () => result
      );
    }

    return result;
  }

  /**
   * Track multiple tool calls
   */
  async trackToolCalls(
    toolCalls: ToolCall[],
    executeTool: (toolCall: ToolCall) => Promise<unknown>
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      await this.trackToolCall(
        toolCall.name,
        toolCall.args,
        async () => {
          if (toolCall.status === 'pending') {
            toolCall.status = 'running';
            toolCall.startedAt = new Date();
          }
          
          const result = await executeTool(toolCall);
          
          toolCall.status = 'completed';
          toolCall.result = result;
          toolCall.completedAt = new Date();
          
          return result;
        }
      );
    }
  }

  /**
   * Track agent planning
   */
  async trackPlanning<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    return OpenTelemetryUtils.trackAgentExecution(
      `${this.agentName}-planning`,
      fn,
      {
        sessionId: this.sessionId,
        userId: this.userId,
        attributes: {
          [AISpanAttributes.AGENT_NAME]: this.agentName,
          phase: 'planning',
          [AISpanAttributes.SESSION_ID]: this.sessionId,
        },
      }
    );
  }

  /**
   * End agent execution
   */
  async endAgentExecution(result: string, toolCalls: ToolCall[]) {
    if (this.enableLangfuse && this.langfuseTrace) {
      // Track all tool calls as spans
      for (const toolCall of toolCalls) {
        const span = this.langfuseTrace.span({
          name: `tool:${toolCall.name}`,
          input: toolCall.args,
          output: toolCall.result,
          metadata: {
            toolName: toolCall.name,
            status: toolCall.status,
            duration: toolCall.completedAt && toolCall.startedAt
              ? toolCall.completedAt.getTime() - toolCall.startedAt.getTime()
              : undefined,
          },
        });
        span.end();
      }

      // Create generation for final result
      const generation = this.langfuseTrace.generation({
        name: 'agent-execution',
        model: 'agent',
        input: this.task,
        output: result,
        metadata: {
          agentName: this.agentName,
          toolCount: toolCalls.length,
          tools: toolCalls.map(t => ({ name: t.name, status: t.status })),
          ...this.metadata,
        },
      });

      generation.end();
    }
  }

  /**
   * Get trace URL
   */
  getTraceUrl(): string | null {
    if (this.langfuseTrace && this.langfuseTrace.getTraceUrl) {
      return this.langfuseTrace.getTraceUrl();
    }
    return null;
  }
}

/**
 * Create an agent observability manager
 */
export function createAgentObservabilityManager(
  config: AgentObservabilityConfig
): AgentObservabilityManager {
  return new AgentObservabilityManager(config);
}
