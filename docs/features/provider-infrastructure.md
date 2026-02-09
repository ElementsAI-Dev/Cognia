# Provider Infrastructure

This document describes the provider management infrastructure that provides fault tolerance, load balancing, quota management, and health monitoring for AI and search providers.

## Overview

The provider infrastructure consists of several interconnected modules:

| Module | Purpose |
|--------|---------|
| **Circuit Breaker** | Prevents cascading failures by temporarily blocking requests to failing providers |
| **Load Balancer** | Distributes requests across multiple providers using various strategies |
| **Quota Manager** | Tracks usage and enforces cost/request limits |
| **Availability Monitor** | Continuously monitors provider health |
| **Provider Manager** | Unified service integrating all components |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Provider Manager                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Circuit   │  │    Load     │  │   Availability          │  │
│  │   Breaker   │  │  Balancer   │  │   Monitor               │  │
│  │  Registry   │  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Quota     │  │    Rate     │  │   API Key               │  │
│  │   Manager   │  │   Limiter   │  │   Rotation              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Circuit Breaker

The circuit breaker prevents cascading failures by tracking provider health and temporarily blocking requests to failing providers.

### States

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Provider is failing, requests are rejected immediately (503 error)
- **HALF_OPEN**: Testing if provider has recovered

### State Transitions

```
CLOSED ─(failures ≥ threshold)→ OPEN ─(timeout)→ HALF_OPEN
                                                      │
                              ┌──(success ≥ threshold)┘
                              ↓
                           CLOSED ←── HALF_OPEN ──(failure)→ OPEN
```

### Configuration

```typescript
const config: CircuitBreakerConfig = {
  failureThreshold: 5,      // Failures before opening
  resetTimeout: 30000,      // ms before half-open
  successThreshold: 3,      // Successes to close
  failureWindow: 60000,     // Window for counting failures
  requestTimeout: 30000,    // Request timeout
};
```

### Usage

```typescript
import { 
  withCircuitBreaker, 
  isProviderAvailable,
  circuitBreakerRegistry 
} from '@/lib/ai/infrastructure';

// Check availability before request
if (!isProviderAvailable('openai')) {
  throw new Error('Provider unavailable');
}

// Execute with circuit breaker protection
const result = await withCircuitBreaker('openai', async () => {
  return await callOpenAI(prompt);
});

// Manual recording
circuitBreakerRegistry.get('openai').recordSuccess();
circuitBreakerRegistry.get('openai').recordFailure(error);
```

## Load Balancer

Distributes requests across multiple providers using configurable strategies.

### Strategies

| Strategy | Description |
|----------|-------------|
| `round-robin` | Cycles through providers in order |
| `weighted` | Distributes based on provider weights |
| `least-connections` | Routes to provider with fewest active requests |
| `latency-based` | Routes to fastest responding provider |
| `adaptive` | Combines multiple factors for optimal routing |
| `priority` | Follows configured priority order with fallback |

### Usage

```typescript
import { 
  withLoadBalancing, 
  withFailover,
  ProviderLoadBalancer 
} from '@/lib/ai/infrastructure';

// Simple load balancing
const result = await withLoadBalancing(
  ['openai', 'anthropic', 'google'],
  async (providerId) => callProvider(providerId, prompt),
  { strategy: 'adaptive' }
);

// With automatic failover
const result = await withFailover(
  ['openai', 'anthropic', 'google'],
  async (providerId) => callProvider(providerId, prompt),
  3 // maxRetries
);

// Manual control
const lb = new ProviderLoadBalancer({ strategy: 'weighted' });
lb.initialize(['openai', 'anthropic']);
const selection = await lb.selectProvider();
```

## Quota Manager

Tracks API usage and enforces cost and request limits.

### Features

- Request/token/cost limits per day and month
- Warning and critical thresholds
- Usage history and reporting
- Cost calculation per provider

### Configuration

```typescript
const limits: QuotaLimits = {
  maxRequestsPerDay: 10000,
  maxRequestsPerMonth: 300000,
  maxTokensPerDay: 1000000,
  maxCostPerDay: 10,      // USD
  maxCostPerMonth: 100,   // USD
};

quotaManager.setLimits('openai', limits);
```

### Usage

```typescript
import { 
  recordApiUsage, 
  checkQuota, 
  getProviderQuotaStatus,
  calculateRequestCost 
} from '@/lib/ai/infrastructure';

// Check quota before request
const { allowed, reason } = checkQuota('openai');
if (!allowed) {
  throw new Error(`Quota exceeded: ${reason}`);
}

// Record usage after request
recordApiUsage({
  providerId: 'openai',
  modelId: 'gpt-4o',
  inputTokens: 1000,
  outputTokens: 500,
  cost: calculateRequestCost('openai', 'gpt-4o', 1000, 500),
  success: true,
  latencyMs: 1200,
});

// Get status
const status = getProviderQuotaStatus('openai');
console.log(`Remaining today: ${status.remaining.requestsToday}`);
console.log(`Cost this month: $${status.usage.thisMonth.totalCost}`);
```

## Availability Monitor

Continuously monitors provider health through periodic health checks.

### Features

- Periodic health checks
- Uptime percentage tracking
- Event-based notifications
- Latency monitoring

### Usage

```typescript
import { 
  getAvailabilityMonitor,
  isProviderHealthy,
  checkProviderHealth 
} from '@/lib/ai/infrastructure';

// Check current health
const healthy = isProviderHealthy('openai');

// Manual health check
const result = await checkProviderHealth('openai');

// Subscribe to status changes
const monitor = getAvailabilityMonitor();
monitor.subscribe((event) => {
  if (event.type === 'status_changed') {
    console.log(`${event.providerId}: ${event.previousStatus} → ${event.currentStatus}`);
  }
});

// Start continuous monitoring
monitor.start();
```

## Provider Manager

Unified service that integrates all infrastructure components.

### Features

- Single entry point for all provider operations
- Automatic failover and retry
- API key rotation
- Comprehensive state tracking

### Usage

```typescript
import { 
  getProviderManager, 
  executeWithProviderManager 
} from '@/lib/ai/infrastructure';

// Initialize
const manager = getProviderManager();
manager.initialize([
  { id: 'openai', credentials: { apiKey: 'sk-...' }, enabled: true },
  { id: 'anthropic', credentials: { apiKey: 'sk-ant-...' }, enabled: true },
]);

// Execute with full management
const result = await executeWithProviderManager(
  async (ctx) => {
    // ctx contains: providerId, apiKey, modelId, attempt
    return await callAI(ctx.providerId, ctx.apiKey, prompt);
  },
  { modelId: 'gpt-4o', maxRetries: 3 }
);

// Get provider state
const state = manager.getProviderState('openai');
console.log(`Circuit: ${state.circuitState}`);
console.log(`Availability: ${state.availability?.status}`);
```

## React Integration

Use the `useProviderManager` hook for React components.

```typescript
import { useProviderManager, useProviderHealth } from '@/hooks/ai/use-provider-manager';

function MyComponent() {
  const { 
    execute, 
    summary, 
    quotaAlerts,
    refreshHealth 
  } = useProviderManager();

  const { 
    isAvailable, 
    circuitState, 
    quota 
  } = useProviderHealth('openai');

  const handleSubmit = async () => {
    const result = await execute(
      async (ctx) => callAI(ctx),
      { modelId: 'gpt-4o' }
    );
  };

  return (
    <div>
      <p>Available providers: {summary.availableProviders}</p>
      <p>OpenAI status: {isAvailable ? 'Available' : 'Unavailable'}</p>
      <p>Circuit state: {circuitState}</p>
    </div>
  );
}
```

## Search Provider Manager

Specialized manager for search providers with similar capabilities.

```typescript
import { 
  getSearchProviderManager,
  searchWithManager 
} from '@/lib/search/search-provider-manager';

// Initialize
const manager = getSearchProviderManager();
manager.initialize({
  tavily: { enabled: true, apiKey: '...', priority: 1 },
  perplexity: { enabled: true, apiKey: '...', priority: 2 },
});

// Search with automatic failover
const result = await searchWithManager('query');
console.log(`Used provider: ${result.providerId}`);
console.log(`Latency: ${result.latencyMs}ms`);
```

## Testing

All modules have comprehensive test coverage:

```bash
pnpm test lib/ai/infrastructure/

# Results: 203 tests passing
# - circuit-breaker.test.ts: 33 tests
# - load-balancer.test.ts: 26 tests
# - quota-manager.test.ts: 28 tests
# - availability-monitor.test.ts: 29 tests
# - rate-limit.test.ts: 15 tests
# - api-key-rotation.test.ts: 29 tests
# - cache-middleware.test.ts: 14 tests
# - telemetry.test.ts: 17 tests
# - api-test.test.ts: 10 tests
```

## Best Practices

1. **Always check availability** before making requests:

   ```typescript
   if (!isProviderAvailable(provider)) {
     // Handle unavailability
   }
   ```

2. **Record both success and failure**:

   ```typescript
   try {
     const result = await callAI();
     circuitBreakerRegistry.get(provider).recordSuccess();
   } catch (error) {
     circuitBreakerRegistry.get(provider).recordFailure(error);
     throw error;
   }
   ```

3. **Use withFailover for critical operations**:

   ```typescript
   const result = await withFailover(
     ['primary', 'secondary', 'tertiary'],
     callProvider
   );
   ```

4. **Monitor quota usage** to avoid unexpected costs:

   ```typescript
   const status = getProviderQuotaStatus('openai');
   if (status.remaining.costThisMonth < 10) {
     // Warn user about low budget
   }
   ```

## File Structure

```
lib/ai/infrastructure/
├── circuit-breaker.ts          # Circuit breaker implementation
├── circuit-breaker.test.ts     # Tests
├── load-balancer.ts            # Load balancing strategies
├── load-balancer.test.ts       # Tests
├── quota-manager.ts            # Usage tracking and limits
├── quota-manager.test.ts       # Tests
├── availability-monitor.ts     # Health monitoring
├── availability-monitor.test.ts # Tests
├── provider-manager.ts         # Unified manager
├── rate-limit.ts               # Rate limiting (existing)
├── api-key-rotation.ts         # Key rotation (existing)
├── api-test.ts                 # Connection testing (existing)
├── cache-middleware.ts         # Response caching (existing)
├── telemetry.ts                # Observability (existing)
└── index.ts                    # Unified exports

lib/search/
└── search-provider-manager.ts  # Search provider management

hooks/ai/
└── use-provider-manager.ts     # React integration
```
