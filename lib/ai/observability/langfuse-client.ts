/**
 * Langfuse Client - AI observability integration
 * 
 * Provides Langfuse integration for tracing AI operations, including:
 * - Chat session tracking
 * - Generation tracking
 * - Tool call tracking
 * - Agent execution tracking
 * - Cost and usage metrics
 * 
 * Based on Langfuse documentation:
 * https://langfuse.com/docs/sdk/typescript/low-level-sdk
 */

import { Langfuse, LangfuseTraceClient, LangfuseGenerationClient } from 'langfuse';
import type { CoreMessage } from 'ai';

/**
 * Langfuse configuration
 */
export interface LangfuseConfig {
  /** Langfuse public key */
  publicKey?: string;
  /** Langfuse secret key */
  secretKey?: string;
  /** Langfuse host URL (default: https://cloud.langfuse.com) */
  host?: string;
  /** Enable/disable Langfuse */
  enabled?: boolean;
  /** Flush interval in milliseconds */
  flushInterval?: number;
  /** Maximum number of events in buffer before flushing */
  maxBufferSize?: number;
}

/**
 * Chat trace options
 */
export interface ChatTraceOptions {
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Generation options
 */
export interface GenerationOptions {
  /** Generation name */
  name?: string;
  /** Model name */
  model: string;
  /** Model parameters */
  modelParameters?: Record<string, unknown>;
  /** Input messages */
  input?: CoreMessage[] | string;
  /** Output text */
  output?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Completion start time */
  completionStartTime?: Date;
  /** Finish reason */
  finishReason?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Level (default: DEFAULT) */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
}

/**
 * Span options
 */
export interface SpanOptions {
  /** Span name */
  name: string;
  /** Input data */
  input?: unknown;
  /** Output data */
  output?: unknown;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Level */
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
}

/**
 * Score options
 */
export interface ScoreOptions {
  /** Score name */
  name: string;
  /** Score value (0-1) */
  value: number;
  /** Comment */
  comment?: string;
  /** Data type */
  dataType?: 'NUMERIC' | 'CATEGORICAL' | 'BOOLEAN';
}

// Global Langfuse instance
let langfuseInstance: Langfuse | null = null;

/**
 * Get or create Langfuse instance
 */
export function getLangfuse(config?: LangfuseConfig): Langfuse {
  if (langfuseInstance) {
    return langfuseInstance;
  }

  const enabled = config?.enabled ?? 
    (process.env.LANGFUSE_ENABLED === 'true' || 
     !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY));

  if (!enabled) {
    // Return a no-op client if disabled
    return createNoOpLangfuse();
  }

  langfuseInstance = new Langfuse({
    publicKey: config?.publicKey || process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: config?.secretKey || process.env.LANGFUSE_SECRET_KEY,
    baseUrl: config?.host || process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
    flushInterval: config?.flushInterval || 5000,
  });

  return langfuseInstance;
}

/**
 * Create a no-op Langfuse client for when observability is disabled
 */
function createNoOpLangfuse(): Langfuse {
  const noop = () => {};
  const noopAsync = async () => {};
  const noopTrace = () => ({
    update: noop,
    end: noop,
    generation: () => ({
      update: noop,
      end: noop,
    }),
    span: () => ({
      update: noop,
      end: noop,
    }),
    score: noop,
  });

  return {
    trace: noopTrace,
    flushAsync: noopAsync,
  } as unknown as Langfuse;
}

/**
 * Create a chat trace
 */
export function createChatTrace(
  options: ChatTraceOptions
): LangfuseTraceClient {
  const langfuse = getLangfuse();

  return langfuse.trace({
    name: 'ai-chat',
    sessionId: options.sessionId,
    userId: options.userId,
    metadata: {
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      ...options.metadata,
    },
    tags: options.tags,
  });
}

/**
 * Create a generation within a trace
 */
export function createGeneration(
  trace: LangfuseTraceClient,
  options: GenerationOptions
): LangfuseGenerationClient {
  return trace.generation({
    name: options.name || 'ai-generation',
    model: options.model,
    modelParameters: options.modelParameters as Record<string, string | number | boolean | string[] | null> | undefined,
    input: options.input,
    output: options.output,
    usage: options.usage ? {
      input: options.usage.promptTokens,
      output: options.usage.completionTokens,
      total: options.usage.totalTokens,
      unit: 'TOKENS' as const,
    } : undefined,
    completionStartTime: options.completionStartTime,
    metadata: options.metadata as Record<string, string | number | boolean | string[] | null> | undefined,
    level: options.level || 'DEFAULT',
  });
}

/**
 * Create a span within a trace
 */
export function createSpan(
  trace: LangfuseTraceClient,
  options: SpanOptions
) {
  return trace.span({
    name: options.name,
    input: options.input,
    output: options.output,
    metadata: options.metadata,
    level: options.level || 'DEFAULT',
  });
}

/**
 * Add a score to a trace
 */
export function addScore(
  trace: LangfuseTraceClient,
  options: ScoreOptions
) {
  trace.score({
    name: options.name,
    value: options.value,
    comment: options.comment,
    dataType: options.dataType || 'NUMERIC',
  });
}

/**
 * Flush all pending traces
 */
export async function flushLangfuse(): Promise<void> {
  const langfuse = getLangfuse();
  await langfuse.flushAsync();
}

/**
 * Shutdown Langfuse client
 */
export async function shutdownLangfuse(): Promise<void> {
  if (langfuseInstance) {
    await langfuseInstance.flushAsync();
    langfuseInstance = null;
  }
}

/**
 * Check if Langfuse is enabled
 */
export function isLangfuseEnabled(): boolean {
  return process.env.LANGFUSE_ENABLED === 'true' || 
    !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

/**
 * Get Langfuse trace URL for a trace ID
 */
export function getTraceUrl(traceId: string): string {
  const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';
  return `${host}/trace/${traceId}`;
}

/**
 * Create a generation with automatic error handling
 */
export async function createGenerationWithErrorHandling(
  trace: LangfuseTraceClient,
  options: GenerationOptions,
  fn: () => Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number }; finishReason?: string }>
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number }; finishReason?: string }> {
  const generation = createGeneration(trace, options);

  try {
    const result = await fn();

    generation.update({
      output: result.text,
      usage: result.usage ? {
        input: result.usage.promptTokens,
        output: result.usage.completionTokens,
        total: result.usage.totalTokens,
        unit: 'TOKENS',
      } : undefined,
    });

    generation.end();

    return result;
  } catch (error) {
    generation.update({
      level: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    generation.end();

    throw error;
  }
}

/**
 * Create a span with automatic error handling
 */
export async function createSpanWithErrorHandling(
  trace: LangfuseTraceClient,
  options: SpanOptions,
  fn: () => Promise<unknown>
): Promise<unknown> {
  const span = createSpan(trace, options);

  try {
    const result = await fn();

    span.update({
      output: result,
      level: 'DEFAULT',
    });

    span.end();

    return result;
  } catch (error) {
    span.update({
      level: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    span.end();

    throw error;
  }
}

/**
 * Langfuse utilities for common patterns
 */
export const LangfuseUtils = {
  /**
   * Track a chat message exchange
   */
  async trackChatExchange(
    sessionId: string,
    userId: string | undefined,
    model: string,
    messages: CoreMessage[],
    response: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    metadata?: Record<string, unknown>
  ) {
    const trace = createChatTrace({
      sessionId,
      userId,
      metadata,
    });

    const generation = createGeneration(trace, {
      name: 'chat-exchange',
      model,
      input: messages,
      output: response,
      usage,
      metadata,
    });

    generation.end();
    await flushLangfuse();

    return trace;
  },

  /**
   * Track an agent execution
   */
  async trackAgentExecution(
    sessionId: string,
    userId: string | undefined,
    agentName: string,
    task: string,
    result: string,
    toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>,
    metadata?: Record<string, unknown>
  ) {
    const trace = createChatTrace({
      sessionId,
      userId,
      tags: ['agent', agentName],
      metadata: {
        agentName,
        task,
        ...metadata,
      },
    });

    // Create spans for each tool call
    for (const toolCall of toolCalls) {
      const span = createSpan(trace, {
        name: `tool:${toolCall.name}`,
        input: toolCall.args,
        output: toolCall.result,
        metadata: {
          toolName: toolCall.name,
        },
      });
      span.end();
    }

    const generation = createGeneration(trace, {
      name: 'agent-execution',
      model: 'agent',
      input: task,
      output: result,
      metadata: {
        agentName,
        toolCount: toolCalls.length,
      },
    });

    generation.end();
    await flushLangfuse();

    return trace;
  },

  /**
   * Track a workflow execution
   */
  async trackWorkflowExecution(
    sessionId: string,
    userId: string | undefined,
    workflowName: string,
    nodes: Array<{ id: string; type: string; status: string; duration?: number }>,
    metadata?: Record<string, unknown>
  ) {
    const trace = createChatTrace({
      sessionId,
      userId,
      tags: ['workflow', workflowName],
      metadata: {
        workflowName,
        nodeCount: nodes.length,
        ...metadata,
      },
    });

    // Create spans for each node
    for (const node of nodes) {
      const span = createSpan(trace, {
        name: `node:${node.type}`,
        metadata: {
          nodeId: node.id,
          nodeType: node.type,
          status: node.status,
          duration: node.duration,
        },
      });
      span.end();
    }

    trace.update({
      output: {
        workflowName,
        nodes: nodes.map(n => ({ id: n.id, type: n.type, status: n.status })),
      },
    });

    await flushLangfuse();

    return trace;
  },
};
