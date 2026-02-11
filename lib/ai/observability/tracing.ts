/**
 * OpenTelemetry Tracing - Distributed tracing integration
 * 
 * Provides OpenTelemetry integration for distributed tracing across
 * the application, including:
 * - Automatic instrumentation
 * - Manual span creation
 * - Context propagation
 * - Metrics collection
 * 
 * Note: This module is designed to be resilient to browser environments.
 * OpenTelemetry SDK features are only available in Node.js server context.
 */

import { loggers } from '@/lib/logger';

const log = loggers.ai;

// Only import OpenTelemetry in Node.js environment
const isServer = typeof window === 'undefined';

/** Lazily loaded OpenTelemetry module references */
interface OtelModules {
  NodeSDK: new (config: Record<string, unknown>) => NodeSDKInstance;
  OTLPTraceExporter: new (config?: Record<string, unknown>) => unknown;
  getNodeAutoInstrumentations: (config?: Record<string, unknown>) => unknown[];
  SEMRESATTRS_SERVICE_NAME: string;
  SEMRESATTRS_SERVICE_VERSION: string;
  resourceFromAttributes: (attrs: Record<string, string>) => unknown;
}

/** NodeSDK instance shape */
interface NodeSDKInstance {
  start: () => void;
  shutdown: () => Promise<void>;
}

let otelModules: OtelModules | null = null;

// Dynamic import for server-side only
async function loadOpenTelemetry(): Promise<boolean> {
  if (!isServer || otelModules) return !!otelModules;
  try {
    const sdkNode = (await (0, eval)('import("@opentelemetry/sdk-node")')) as typeof import('@opentelemetry/sdk-node');
    const exporterHttp = (await (0, eval)(
      'import("@opentelemetry/exporter-trace-otlp-http")'
    )) as typeof import('@opentelemetry/exporter-trace-otlp-http');
    const resources = (await (0, eval)('import("@opentelemetry/resources")')) as typeof import('@opentelemetry/resources');
    const autoInstr = (await (0, eval)(
      'import("@opentelemetry/auto-instrumentations-node")'
    )) as typeof import('@opentelemetry/auto-instrumentations-node');
    const semconv = (await (0, eval)(
      'import("@opentelemetry/semantic-conventions")'
    )) as typeof import('@opentelemetry/semantic-conventions');
    
    otelModules = {
      NodeSDK: sdkNode.NodeSDK,
      OTLPTraceExporter: exporterHttp.OTLPTraceExporter,
      getNodeAutoInstrumentations: autoInstr.getNodeAutoInstrumentations,
      SEMRESATTRS_SERVICE_NAME: semconv.SEMRESATTRS_SERVICE_NAME || 'service.name',
      SEMRESATTRS_SERVICE_VERSION: semconv.SEMRESATTRS_SERVICE_VERSION || 'service.version',
      resourceFromAttributes: resources.resourceFromAttributes,
    };
    return true;
  } catch (error) {
    log.warn('Failed to load OpenTelemetry modules', { error });
    return false;
  }
}

// Basic OpenTelemetry API types - these work in browser too
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import type { Span, SpanOptions } from '@opentelemetry/api';

/**
 * OpenTelemetry configuration
 */
export interface OpenTelemetryConfig {
  /** Service name */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
  /** OTLP endpoint for traces */
  traceEndpoint?: string;
  /** OTLP endpoint for metrics */
  metricEndpoint?: string;
  /** Enable/disable tracing */
  tracingEnabled?: boolean;
  /** Enable/disable metrics */
  metricsEnabled?: boolean;
  /** Additional resource attributes */
  resourceAttributes?: Record<string, string>;
}

// Global SDK instance
let sdk: NodeSDKInstance | null = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry SDK
 * Note: This is a no-op in browser environments
 */
export async function initializeOpenTelemetry(config?: OpenTelemetryConfig): Promise<unknown> {
  if (!isServer || isInitialized) {
    return sdk;
  }

  const tracingEnabled = config?.tracingEnabled ?? 
    (process.env.OTEL_TRACING_ENABLED !== 'false');
  const metricsEnabled = config?.metricsEnabled ?? 
    (process.env.OTEL_METRICS_ENABLED !== 'false');

  if (!tracingEnabled && !metricsEnabled) {
    return null;
  }

  // Load OpenTelemetry modules dynamically
  const loaded = await loadOpenTelemetry();
  if (!loaded || !otelModules) {
    log.warn('OpenTelemetry could not be loaded - tracing disabled');
    return null;
  }

  try {
    const { NodeSDK: SDK, OTLPTraceExporter: Exporter, resourceFromAttributes, SEMRESATTRS_SERVICE_NAME: serviceName, SEMRESATTRS_SERVICE_VERSION: serviceVersion, getNodeAutoInstrumentations: getAutoInstr } = otelModules;

    // Create resource using resourceFromAttributes (newer API)
    const resourceAttrs = {
      [serviceName]: config?.serviceName || process.env.OTEL_SERVICE_NAME || 'cognia-ai',
      [serviceVersion]: config?.serviceVersion || process.env.APP_VERSION || '1.0.0',
      ...config?.resourceAttributes,
    };
    const resource = resourceFromAttributes ? resourceFromAttributes(resourceAttrs) : undefined;

    const traceExporter = tracingEnabled && Exporter
      ? new Exporter({
          url: config?.traceEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        })
      : undefined;

    sdk = new SDK({
      resource,
      traceExporter,
      instrumentations: getAutoInstr ? [
        getAutoInstr({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ] : [],
    });

    sdk.start();
    isInitialized = true;

    return sdk;
  } catch (error) {
    log.warn('Failed to initialize OpenTelemetry', { error });
    return null;
  }
}

/**
 * Shutdown OpenTelemetry SDK
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}

/**
 * Get tracer
 */
export function getTracer(name: string, version?: string) {
  return trace.getTracer(name, version);
}

/**
 * Create a span with automatic error handling
 */
export async function createSpanWithErrorHandling<T>(
  name: string,
  fn: () => Promise<T>,
  options?: SpanOptions & {
    attributes?: Record<string, string | number | boolean | string[]>;
    kind?: SpanKind;
  }
): Promise<T> {
  const tracer = getTracer('cognia-ai');
  const span = tracer.startSpan(name, {
    kind: options?.kind,
    attributes: options?.attributes,
  });

  try {
    const result = await context.with(
      trace.setSpan(context.active(), span),
      async () => fn()
    );

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.end();

    throw error;
  }
}

/**
 * Create a child span
 */
export function createChildSpan(
  parentSpan: Span,
  name: string,
  options?: {
    attributes?: Record<string, string | number | boolean | string[]>;
  }
): Span {
  const tracer = getTracer('cognia-ai');
  const ctx = trace.setSpan(context.active(), parentSpan);
  return tracer.startSpan(name, {
    attributes: options?.attributes,
  }, ctx);
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean | string[]>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(
  name: string,
  attributes?: Record<string, string | number | boolean | string[]>
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Record exception in current span
 */
export function recordException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  return span?.spanContext().traceId;
}

/**
 * Get current span ID
 */
export function getCurrentSpanId(): string | undefined {
  const span = trace.getActiveSpan();
  return span?.spanContext().spanId;
}

/**
 * Common span attributes for AI operations
 */
export const AISpanAttributes = {
  MODEL: 'ai.model',
  PROVIDER: 'ai.provider',
  TEMPERATURE: 'ai.temperature',
  MAX_TOKENS: 'ai.max_tokens',
  TOP_P: 'ai.top_p',
  PROMPT_TOKENS: 'ai.usage.prompt_tokens',
  COMPLETION_TOKENS: 'ai.usage.completion_tokens',
  TOTAL_TOKENS: 'ai.usage.total_tokens',
  FINISH_REASON: 'ai.finish_reason',
  SESSION_ID: 'ai.session_id',
  USER_ID: 'ai.user_id',
  AGENT_NAME: 'ai.agent_name',
  TOOL_NAME: 'ai.tool_name',
  WORKFLOW_NAME: 'ai.workflow_name',
  NODE_ID: 'ai.node_id',
  NODE_TYPE: 'ai.node_type',
} as const;

/**
 * Common span names
 */
export const AISpanNames = {
  AI_CHAT: 'ai.chat',
  AI_GENERATION: 'ai.generation',
  AI_STREAMING: 'ai.streaming',
  AGENT_EXECUTION: 'agent.execution',
  AGENT_PLANNING: 'agent.planning',
  AGENT_TOOL_CALL: 'agent.tool_call',
  WORKFLOW_EXECUTION: 'workflow.execution',
  WORKFLOW_NODE_EXECUTION: 'workflow.node_execution',
  RAG_RETRIEVAL: 'rag.retrieval',
  RAG_EMBEDDING: 'rag.embedding',
  MEMORY_RETRIEVAL: 'memory.retrieval',
  MEMORY_STORAGE: 'memory.storage',
} as const;

/**
 * Utility functions for common patterns
 */
export const OpenTelemetryUtils = {
  /**
   * Track an AI generation
   */
  async trackAIGeneration<T>(
    model: string,
    provider: string,
    fn: () => Promise<T>,
    options?: {
      sessionId?: string;
      userId?: string;
      temperature?: number;
      maxTokens?: number;
      attributes?: Record<string, unknown>;
    }
  ): Promise<T> {
    // Build attributes, filtering out undefined values
    const attrs: Record<string, string | number | boolean | string[]> = {
      [AISpanAttributes.MODEL]: model,
      [AISpanAttributes.PROVIDER]: provider,
    };
    if (options?.temperature !== undefined) attrs[AISpanAttributes.TEMPERATURE] = options.temperature;
    if (options?.maxTokens !== undefined) attrs[AISpanAttributes.MAX_TOKENS] = options.maxTokens;
    if (options?.sessionId) attrs[AISpanAttributes.SESSION_ID] = options.sessionId;
    if (options?.userId) attrs[AISpanAttributes.USER_ID] = options.userId;

    return createSpanWithErrorHandling(
      AISpanNames.AI_GENERATION,
      fn,
      {
        kind: SpanKind.CLIENT,
        attributes: attrs,
      }
    );
  },

  /**
   * Track an agent execution
   */
  async trackAgentExecution<T>(
    agentName: string,
    fn: () => Promise<T>,
    options?: {
      sessionId?: string;
      userId?: string;
      attributes?: Record<string, unknown>;
    }
  ): Promise<T> {
    const attrs: Record<string, string | number | boolean | string[]> = {
      [AISpanAttributes.AGENT_NAME]: agentName,
    };
    if (options?.sessionId) attrs[AISpanAttributes.SESSION_ID] = options.sessionId;
    if (options?.userId) attrs[AISpanAttributes.USER_ID] = options.userId;

    return createSpanWithErrorHandling(
      AISpanNames.AGENT_EXECUTION,
      fn,
      {
        kind: SpanKind.INTERNAL,
        attributes: attrs,
      }
    );
  },

  /**
   * Track a tool call
   */
  async trackToolCall<T>(
    toolName: string,
    fn: () => Promise<T>,
    options?: {
      attributes?: Record<string, unknown>;
    }
  ): Promise<T> {
    return createSpanWithErrorHandling(
      AISpanNames.AGENT_TOOL_CALL,
      fn,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [AISpanAttributes.TOOL_NAME]: toolName,
          ...options?.attributes,
        },
      }
    );
  },

  /**
   * Track a workflow execution
   */
  async trackWorkflowExecution<T>(
    workflowName: string,
    fn: () => Promise<T>,
    options?: {
      sessionId?: string;
      userId?: string;
      attributes?: Record<string, unknown>;
    }
  ): Promise<T> {
    const attrs: Record<string, string | number | boolean | string[]> = {
      [AISpanAttributes.WORKFLOW_NAME]: workflowName,
    };
    if (options?.sessionId) attrs[AISpanAttributes.SESSION_ID] = options.sessionId;
    if (options?.userId) attrs[AISpanAttributes.USER_ID] = options.userId;

    return createSpanWithErrorHandling(
      AISpanNames.WORKFLOW_EXECUTION,
      fn,
      {
        kind: SpanKind.INTERNAL,
        attributes: attrs,
      }
    );
  },

  /**
   * Track a workflow node execution
   */
  async trackWorkflowNodeExecution<T>(
    nodeId: string,
    nodeType: string,
    fn: () => Promise<T>,
    _options?: {
      attributes?: Record<string, unknown>;
    }
  ): Promise<T> {
    const attrs: Record<string, string | number | boolean | string[]> = {
      [AISpanAttributes.NODE_ID]: nodeId,
      [AISpanAttributes.NODE_TYPE]: nodeType,
    };

    return createSpanWithErrorHandling(
      AISpanNames.WORKFLOW_NODE_EXECUTION,
      fn,
      {
        kind: SpanKind.INTERNAL,
        attributes: attrs,
      }
    );
  },
};
