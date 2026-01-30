# Logger Module

Unified logging system for Cognia with structured logging, multiple transports, and request tracing.

## Architecture

```
lib/logger/
├── index.ts          # Main entry point, exports all APIs
├── core.ts           # Core logger implementation
├── context.ts        # Session and trace ID management
├── sampling.ts       # Log sampling and rate limiting
├── types.ts          # TypeScript type definitions
└── transports/
    ├── index.ts              # Transport exports
    ├── console-transport.ts  # Console output with colors
    ├── indexeddb-transport.ts # Persistent storage
    └── remote-transport.ts   # Remote log shipping
```

## Usage

### Basic Logging

```typescript
import { logger, createLogger } from '@/lib/logger';

// Use default app logger
logger.info('Application started');
logger.error('Something failed', new Error('Details'));

// Create module-specific logger
const authLogger = createLogger('auth');
authLogger.debug('Login attempt', { userId: '123' });
```

### Pre-configured Module Loggers

```typescript
import { loggers } from '@/lib/logger';

loggers.ai.info('AI request');
loggers.chat.debug('Chat message');
loggers.agent.warn('Agent timeout');
loggers.mcp.error('MCP connection failed');
```

### Request Tracing

```typescript
import { logContext, createLogger } from '@/lib/logger';

// Generate trace ID for request
logContext.newTraceId();

// All logs will include this trace ID
const logger = createLogger('api');
logger.info('Processing request'); // Includes traceId

// Clear after request
logContext.clearTraceId();
```

### Child Loggers and Context

```typescript
const baseLogger = createLogger('service');
const childLogger = baseLogger.child('submodule');
const contextLogger = baseLogger.withContext({ requestId: '456' });

childLogger.info('Message'); // module: "service:submodule"
contextLogger.info('Message'); // includes requestId in data
```

### Configuration

```typescript
import { initLogger, updateLoggerConfig, createConsoleTransport, createIndexedDBTransport } from '@/lib/logger';

// Initialize with custom config and transports
initLogger(
  {
    minLevel: 'debug',
    enableConsole: true,
    enableStorage: true,
    includeStackTrace: true,
  },
  [
    createConsoleTransport({ useColors: true }),
    createIndexedDBTransport({ maxEntries: 5000 }),
  ]
);

// Update config at runtime
updateLoggerConfig({ minLevel: 'warn' });
```

### Sampling Configuration

```typescript
import { configureSampling } from '@/lib/logger';

configureSampling({
  'mouse': { rate: 0.01 },      // 1% sampling for mouse events
  'keyboard': { rate: 0.1 },    // 10% for keyboard
  'error': { rate: 1.0 },       // Always log errors
});
```

## Log Levels

| Level | Priority | Usage |
|-------|----------|-------|
| trace | 0 | Very detailed debugging |
| debug | 1 | Development debugging |
| info | 2 | Normal operations |
| warn | 3 | Potential issues |
| error | 4 | Errors with recovery |
| fatal | 5 | Unrecoverable errors |

## Structured Log Format

```json
{
  "id": "log-abc123",
  "timestamp": "2024-01-29T12:00:00.000Z",
  "level": "info",
  "message": "User logged in",
  "module": "auth",
  "traceId": "req-xyz789",
  "sessionId": "sess-123",
  "data": { "userId": "user-456" },
  "source": { "file": "auth.ts", "line": 42 }
}
```

## Transports

### Console Transport
- Color-coded output
- Timestamps and icons
- Development-friendly formatting

### IndexedDB Transport
- Persistent browser storage
- Async batching for performance
- Automatic cleanup and rotation

### Remote Transport
- HTTP batch shipping
- Retry with exponential backoff
- Offline queue support
- Sentry/Loggly compatible transforms

## Integration

### With React Components

```typescript
import { useLogger } from '@/components/providers/core/logger-provider';

function MyComponent() {
  const logger = useLogger();
  logger.info('Component rendered');
}
```

### With Tauri Commands

```typescript
import { logContext, createLogger } from '@/lib/logger';

async function invokeWithLogging(cmd: string, args: object) {
  const traceId = logContext.newTraceId();
  const logger = createLogger('tauri');
  
  logger.debug(`Invoking ${cmd}`, { traceId, args });
  
  try {
    const result = await invoke(cmd, { ...args, __traceId: traceId });
    logger.debug(`${cmd} completed`, { traceId });
    return result;
  } catch (error) {
    logger.error(`${cmd} failed`, error, { traceId });
    throw error;
  } finally {
    logContext.clearTraceId();
  }
}
```

## Testing

```bash
pnpm test lib/logger
```

## Related Files

- `types/system/logger.ts` - Legacy type definitions
- `components/providers/core/logger-provider.tsx` - React provider
- `components/settings/log-viewer.tsx` - Log viewer UI
