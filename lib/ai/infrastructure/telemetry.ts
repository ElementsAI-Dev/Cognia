/**
 * Telemetry - AI SDK observability and monitoring utilities
 * 
 * Provides standardized telemetry configuration for AI SDK functions.
 * Based on OpenTelemetry for distributed tracing and monitoring.
 * 
 * Based on AI SDK documentation:
 * https://ai-sdk.dev/docs/ai-sdk-core/telemetry
 */

import { loggers } from '@/lib/logger';

const log = loggers.ai;

/**
 * Telemetry configuration for AI SDK functions
 */
export interface TelemetryConfig {
  /** Enable telemetry collection */
  isEnabled: boolean;
  /** Function identifier for grouping telemetry data */
  functionId?: string;
  /** Record input values (prompts, messages) */
  recordInputs?: boolean;
  /** Record output values (responses, tool calls) */
  recordOutputs?: boolean;
  /** Additional metadata to include */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Telemetry event types
 */
export type TelemetryEventType = 
  | 'ai.generateText'
  | 'ai.generateText.doGenerate'
  | 'ai.streamText'
  | 'ai.streamText.doStream'
  | 'ai.generateObject'
  | 'ai.streamObject'
  | 'ai.embed'
  | 'ai.embedMany'
  | 'ai.toolCall'
  | 'ai.stream.firstChunk'
  | 'ai.stream.finish';

/**
 * Telemetry span data
 */
export interface TelemetrySpanData {
  operationId: string;
  functionId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, unknown>;
  events: TelemetryEvent[];
  status: 'ok' | 'error';
  error?: Error;
}

/**
 * Telemetry event
 */
export interface TelemetryEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

/**
 * Telemetry collector interface
 */
export interface TelemetryCollector {
  /** Start a new span */
  startSpan: (operationId: string, attributes?: Record<string, unknown>) => TelemetrySpan;
  /** Record an event */
  recordEvent: (name: string, attributes?: Record<string, unknown>) => void;
  /** Get all collected spans */
  getSpans: () => TelemetrySpanData[];
  /** Clear all collected data */
  clear: () => void;
}

/**
 * Telemetry span interface
 */
export interface TelemetrySpan {
  /** Add attributes to the span */
  setAttribute: (key: string, value: unknown) => void;
  /** Add an event to the span */
  addEvent: (name: string, attributes?: Record<string, unknown>) => void;
  /** End the span successfully */
  end: () => void;
  /** End the span with an error */
  endWithError: (error: Error) => void;
}

/**
 * Create a default telemetry configuration
 */
export function createTelemetryConfig(options?: Partial<TelemetryConfig>): TelemetryConfig {
  return {
    isEnabled: options?.isEnabled ?? false,
    functionId: options?.functionId,
    recordInputs: options?.recordInputs ?? true,
    recordOutputs: options?.recordOutputs ?? true,
    metadata: options?.metadata,
  };
}

/**
 * Create telemetry config for AI SDK's experimental_telemetry parameter
 */
export function toExperimentalTelemetry(config: TelemetryConfig) {
  if (!config.isEnabled) {
    return undefined;
  }

  return {
    isEnabled: true,
    functionId: config.functionId,
    recordInputs: config.recordInputs,
    recordOutputs: config.recordOutputs,
    metadata: config.metadata,
  };
}

/**
 * In-memory telemetry collector for development/debugging
 */
export function createInMemoryTelemetryCollector(): TelemetryCollector {
  const spans: TelemetrySpanData[] = [];
  const globalEvents: TelemetryEvent[] = [];

  return {
    startSpan(operationId: string, attributes?: Record<string, unknown>): TelemetrySpan {
      const spanData: TelemetrySpanData = {
        operationId,
        startTime: Date.now(),
        attributes: attributes || {},
        events: [],
        status: 'ok',
      };

      spans.push(spanData);

      return {
        setAttribute(key: string, value: unknown) {
          spanData.attributes[key] = value;
        },
        addEvent(name: string, eventAttributes?: Record<string, unknown>) {
          spanData.events.push({
            name,
            timestamp: Date.now(),
            attributes: eventAttributes,
          });
        },
        end() {
          spanData.endTime = Date.now();
          spanData.duration = spanData.endTime - spanData.startTime;
        },
        endWithError(error: Error) {
          spanData.endTime = Date.now();
          spanData.duration = spanData.endTime - spanData.startTime;
          spanData.status = 'error';
          spanData.error = error;
        },
      };
    },

    recordEvent(name: string, attributes?: Record<string, unknown>) {
      globalEvents.push({
        name,
        timestamp: Date.now(),
        attributes,
      });
    },

    getSpans() {
      return [...spans];
    },

    clear() {
      spans.length = 0;
      globalEvents.length = 0;
    },
  };
}

/**
 * Console telemetry collector for logging
 */
export function createConsoleTelemetryCollector(options?: {
  prefix?: string;
  logLevel?: 'debug' | 'info' | 'warn';
}): TelemetryCollector {
  const { prefix = '[AI Telemetry]', logLevel = 'info' } = options || {};
  const logger = logLevel === 'debug' ? log.debug.bind(log) : logLevel === 'warn' ? log.warn.bind(log) : log.info.bind(log);
  const spans: TelemetrySpanData[] = [];

  return {
    startSpan(operationId: string, attributes?: Record<string, unknown>): TelemetrySpan {
      const spanData: TelemetrySpanData = {
        operationId,
        startTime: Date.now(),
        attributes: attributes || {},
        events: [],
        status: 'ok',
      };

      spans.push(spanData);
      logger(`${prefix} Starting: ${operationId}`, attributes);

      return {
        setAttribute(key: string, value: unknown) {
          spanData.attributes[key] = value;
        },
        addEvent(name: string, eventAttributes?: Record<string, unknown>) {
          spanData.events.push({
            name,
            timestamp: Date.now(),
            attributes: eventAttributes,
          });
          logger(`${prefix} Event: ${name}`, eventAttributes);
        },
        end() {
          spanData.endTime = Date.now();
          spanData.duration = spanData.endTime - spanData.startTime;
          logger(`${prefix} Completed: ${operationId} (${spanData.duration}ms)`);
        },
        endWithError(error: Error) {
          spanData.endTime = Date.now();
          spanData.duration = spanData.endTime - spanData.startTime;
          spanData.status = 'error';
          spanData.error = error;
          log.error(`${prefix} Error: ${operationId} (${spanData.duration}ms)`, error as Error);
        },
      };
    },

    recordEvent(name: string, attributes?: Record<string, unknown>) {
      logger(`${prefix} Global Event: ${name}`, attributes);
    },

    getSpans() {
      return [...spans];
    },

    clear() {
      spans.length = 0;
    },
  };
}

/**
 * Telemetry metrics aggregator
 */
export interface TelemetryMetrics {
  /** Total number of requests */
  totalRequests: number;
  /** Number of successful requests */
  successfulRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Average response time in ms */
  avgResponseTime: number;
  /** Total tokens used */
  totalTokens: number;
  /** Requests per operation type */
  requestsByOperation: Record<string, number>;
  /** Average time to first chunk (streaming only) */
  avgTimeToFirstChunk?: number;
}

/**
 * Calculate metrics from telemetry spans
 */
export function calculateMetrics(spans: TelemetrySpanData[]): TelemetryMetrics {
  const metrics: TelemetryMetrics = {
    totalRequests: spans.length,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    totalTokens: 0,
    requestsByOperation: {},
  };

  let totalDuration = 0;
  let totalTimeToFirstChunk = 0;
  let firstChunkCount = 0;

  for (const span of spans) {
    // Count success/failure
    if (span.status === 'ok') {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Sum duration
    if (span.duration) {
      totalDuration += span.duration;
    }

    // Count by operation
    metrics.requestsByOperation[span.operationId] = 
      (metrics.requestsByOperation[span.operationId] || 0) + 1;

    // Sum tokens
    const usage = span.attributes['ai.usage'] as { totalTokens?: number } | undefined;
    if (usage?.totalTokens) {
      metrics.totalTokens += usage.totalTokens;
    }

    // Time to first chunk
    const msToFirstChunk = span.attributes['ai.response.msToFirstChunk'] as number | undefined;
    if (msToFirstChunk) {
      totalTimeToFirstChunk += msToFirstChunk;
      firstChunkCount++;
    }
  }

  // Calculate averages
  if (spans.length > 0) {
    metrics.avgResponseTime = totalDuration / spans.length;
  }

  if (firstChunkCount > 0) {
    metrics.avgTimeToFirstChunk = totalTimeToFirstChunk / firstChunkCount;
  }

  return metrics;
}

/**
 * Predefined telemetry configurations
 */
export const TELEMETRY_PRESETS = {
  /** Full telemetry with all inputs/outputs */
  full: createTelemetryConfig({
    isEnabled: true,
    recordInputs: true,
    recordOutputs: true,
  }),
  /** Minimal telemetry without inputs/outputs (for privacy) */
  minimal: createTelemetryConfig({
    isEnabled: true,
    recordInputs: false,
    recordOutputs: false,
  }),
  /** Disabled telemetry */
  disabled: createTelemetryConfig({
    isEnabled: false,
  }),
};

/**
 * Default telemetry collector singleton
 */
let defaultCollector: TelemetryCollector | null = null;

/**
 * Get or create the default telemetry collector
 */
export function getDefaultTelemetryCollector(): TelemetryCollector {
  if (!defaultCollector) {
    // Use console collector in development, in-memory in production
    defaultCollector = process.env.NODE_ENV === 'development'
      ? createConsoleTelemetryCollector()
      : createInMemoryTelemetryCollector();
  }
  return defaultCollector;
}

/**
 * Set the default telemetry collector
 */
export function setDefaultTelemetryCollector(collector: TelemetryCollector): void {
  defaultCollector = collector;
}

/**
 * Create a Language Model Middleware that bridges AI SDK telemetry
 * with the infrastructure's telemetry collector and quota manager.
 *
 * This middleware:
 * - Records every generate/stream call as a telemetry span
 * - Optionally records usage to the quota manager for cost tracking
 * - Captures latency, token counts, and errors
 */
export function createTelemetryMiddleware(options?: {
  /** Telemetry collector to use (defaults to global collector) */
  collector?: TelemetryCollector;
  /** Provider ID for quota tracking */
  providerId?: string;
  /** Callback to record usage to quota manager */
  onUsage?: (record: {
    providerId: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
  }) => void;
}): {
  wrapGenerate: (params: {
    doGenerate: () => Promise<Record<string, unknown>>;
    params: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>;
  wrapStream: (params: {
    doStream: () => Promise<{ stream: ReadableStream }>;
    params: Record<string, unknown>;
  }) => Promise<{ stream: ReadableStream }>;
} {
  const collector = options?.collector || getDefaultTelemetryCollector();
  const providerId = options?.providerId || 'unknown';

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const modelId = (params as Record<string, unknown>).modelId as string || 'unknown';
      const span = collector.startSpan('ai.generateText', {
        'ai.provider': providerId,
        'ai.model': modelId,
      });

      const startTime = Date.now();

      try {
        const result = await doGenerate();
        const latencyMs = Date.now() - startTime;

        // Extract token usage if available
        const usage = result.usage as { promptTokens?: number; completionTokens?: number } | undefined;
        const inputTokens = usage?.promptTokens || 0;
        const outputTokens = usage?.completionTokens || 0;

        span.setAttribute('ai.usage.inputTokens', inputTokens);
        span.setAttribute('ai.usage.outputTokens', outputTokens);
        span.setAttribute('ai.latencyMs', latencyMs);
        span.end();

        // Report usage
        options?.onUsage?.({
          providerId,
          modelId,
          inputTokens,
          outputTokens,
          latencyMs,
          success: true,
        });

        return result;
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        span.setAttribute('ai.latencyMs', latencyMs);
        span.endWithError(error instanceof Error ? error : new Error(String(error)));

        options?.onUsage?.({
          providerId,
          modelId: modelId,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          success: false,
        });

        throw error;
      }
    },

    wrapStream: async ({ doStream, params }) => {
      const modelId = (params as Record<string, unknown>).modelId as string || 'unknown';
      const span = collector.startSpan('ai.streamText', {
        'ai.provider': providerId,
        'ai.model': modelId,
      });

      const startTime = Date.now();
      let firstChunkTime: number | null = null;

      try {
        const result = await doStream();
        const { stream, ...rest } = result;

        let inputTokens = 0;
        let outputTokens = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformStream = new TransformStream<any, any>({
          transform(chunk, controller) {
            if (!firstChunkTime) {
              firstChunkTime = Date.now();
              span.setAttribute('ai.response.msToFirstChunk', firstChunkTime - startTime);
            }

            // Try to extract usage from finish chunks
            if (chunk && typeof chunk === 'object' && chunk.type === 'finish') {
              const usage = chunk.usage as { promptTokens?: number; completionTokens?: number } | undefined;
              if (usage) {
                inputTokens = usage.promptTokens || 0;
                outputTokens = usage.completionTokens || 0;
              }
            }

            controller.enqueue(chunk);
          },
          flush() {
            const latencyMs = Date.now() - startTime;
            span.setAttribute('ai.usage.inputTokens', inputTokens);
            span.setAttribute('ai.usage.outputTokens', outputTokens);
            span.setAttribute('ai.latencyMs', latencyMs);
            span.end();

            options?.onUsage?.({
              providerId,
              modelId,
              inputTokens,
              outputTokens,
              latencyMs,
              success: true,
            });
          },
        });

        return {
          ...rest,
          stream: stream.pipeThrough(transformStream),
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        span.setAttribute('ai.latencyMs', latencyMs);
        span.endWithError(error instanceof Error ? error : new Error(String(error)));

        options?.onUsage?.({
          providerId,
          modelId,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          success: false,
        });

        throw error;
      }
    },
  };
}
