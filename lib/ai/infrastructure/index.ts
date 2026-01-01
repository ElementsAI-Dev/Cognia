/**
 * Infrastructure - Rate limiting, caching, telemetry, and API utilities
 */

// Rate Limiting
export * from './rate-limit';

// Cache Middleware - response caching with simulateReadableStream
export {
  createCacheMiddleware,
  createSimpleCacheMiddleware,
  createIndexedDBCacheStore,
  generateCacheKey,
  getDefaultCacheStore,
  setDefaultCacheStore,
  type CacheMiddlewareOptions,
} from './cache-middleware';

// Telemetry
export {
  createTelemetryConfig,
  toExperimentalTelemetry,
  createInMemoryTelemetryCollector,
  createConsoleTelemetryCollector,
  calculateMetrics,
  getDefaultTelemetryCollector,
  setDefaultTelemetryCollector,
  TELEMETRY_PRESETS,
  type TelemetryConfig,
  type TelemetryCollector,
  type TelemetrySpan,
  type TelemetrySpanData,
  type TelemetryEvent,
  type TelemetryMetrics,
} from './telemetry';

// API utilities (excluding maskApiKey which is in providers/openrouter.ts)
export {
  getDefaultUsageStats,
  getNextApiKey,
  recordApiKeySuccess,
  recordApiKeyError,
  resetApiKeyStats,
  getAggregatedStats,
  isValidApiKeyFormat,
  type ApiKeyWithStats,
  type RotationResult,
} from './api-key-rotation';
export * from './api-test';
