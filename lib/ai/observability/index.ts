/**
 * Observability Index - Main entry point for observability features
 * 
 * Exports all observability-related functionality:
 * - Langfuse client for AI-specific observability
 * - OpenTelemetry for distributed tracing
 * - Utilities and helpers
 */

export * from './langfuse-client';
export {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  getTracer,
  createChildSpan,
  addSpanAttributes,
  addSpanEvent,
  recordException,
  getCurrentTraceId,
  getCurrentSpanId,
  AISpanAttributes,
  AISpanNames,
  OpenTelemetryUtils,
  type OpenTelemetryConfig,
} from './tracing';
export * from './chat-observability';
export * from './agent-observability';

/**
 * Initialize observability systems
 */
export async function initializeObservability(config?: {
  langfuse?: import('./langfuse-client').LangfuseConfig;
  openTelemetry?: import('./tracing').OpenTelemetryConfig;
}): Promise<void> {
  // Initialize Langfuse
  const { getLangfuse } = await import('./langfuse-client');
  getLangfuse(config?.langfuse);

  // Initialize OpenTelemetry
  const { initializeOpenTelemetry } = await import('./tracing');
  initializeOpenTelemetry(config?.openTelemetry);
}

/**
 * Shutdown observability systems
 */
export async function shutdownObservability(): Promise<void> {
  // Shutdown Langfuse
  const { shutdownLangfuse } = await import('./langfuse-client');
  await shutdownLangfuse();

  // Shutdown OpenTelemetry
  const { shutdownOpenTelemetry } = await import('./tracing');
  await shutdownOpenTelemetry();
}
