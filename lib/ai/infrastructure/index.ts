/**
 * Infrastructure - Rate limiting, caching, telemetry, and API utilities
 * 
 * Provides:
 * - Rate Limiting: Request throttling per provider
 * - Circuit Breaker: Fault tolerance and cascading failure prevention
 * - Load Balancer: Intelligent request distribution across providers
 * - Quota Manager: Usage tracking and budget management
 * - Availability Monitor: Continuous health monitoring
 * - Provider Manager: Unified provider management service
 */

// Rate Limiting
export * from './rate-limit';

// Circuit Breaker - Fault tolerance
export {
  CircuitBreaker,
  circuitBreakerRegistry,
  withCircuitBreaker,
  isProviderAvailable,
  getCircuitState,
  recordProviderFailure,
  recordProviderSuccess,
  DEFAULT_CIRCUIT_CONFIG,
  PROVIDER_CIRCUIT_CONFIGS,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
  type CircuitBreakerResult,
} from './circuit-breaker';

// Load Balancer - Request distribution
export {
  ProviderLoadBalancer,
  getLoadBalancer,
  initializeLoadBalancer,
  selectBestProvider,
  withLoadBalancing,
  withFailover,
  type LoadBalancingStrategy,
  type ProviderWeight,
  type ProviderMetrics,
  type LoadBalancerConfig,
  type SelectionResult,
} from './load-balancer';

// Quota Manager - Usage tracking
export {
  QuotaManager,
  getQuotaManager,
  recordApiUsage,
  checkQuota,
  getProviderQuotaStatus,
  calculateRequestCost,
  DEFAULT_QUOTA_LIMITS,
  type QuotaLimits,
  type UsageRecord,
  type UsageStats,
  type QuotaStatus,
  type QuotaAlert,
  type QuotaManagerConfig,
} from './quota-manager';

// Availability Monitor - Health monitoring
export {
  AvailabilityMonitor,
  getAvailabilityMonitor,
  initializeAvailabilityMonitor,
  isProviderHealthy,
  getProviderAvailability,
  checkProviderHealth,
  type AvailabilityStatus,
  type ProviderAvailability,
  type HealthCheckResult,
  type AvailabilityMonitorConfig,
  type AvailabilityEvent,
} from './availability-monitor';

// Provider Manager - Unified management
export {
  ProviderManager,
  getProviderManager,
  initializeProviderManager,
  executeWithProviderManager,
  type ProviderManagerConfig,
  type ProviderCredentials,
  type ProviderState,
  type ExecutionContext,
  type ExecutionResult,
  type RequestOptions,
} from './provider-manager';

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
