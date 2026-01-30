/**
 * Logger Context
 * Manages session ID, trace ID, and context propagation
 */

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Global logger context
 */
class LoggerContext {
  private _sessionId: string;
  private _traceId: string | undefined;
  private _context: Record<string, unknown> = {};

  constructor() {
    this._sessionId = this.initSessionId();
  }

  /**
   * Initialize or restore session ID
   */
  private initSessionId(): string {
    if (typeof window === 'undefined') {
      return generateId();
    }

    const stored = sessionStorage.getItem('cognia-log-session-id');
    if (stored) {
      return stored;
    }

    const newId = generateId();
    sessionStorage.setItem('cognia-log-session-id', newId);
    return newId;
  }

  /**
   * Get current session ID
   */
  get sessionId(): string {
    return this._sessionId;
  }

  /**
   * Get current trace ID
   */
  get traceId(): string | undefined {
    return this._traceId;
  }

  /**
   * Set trace ID for current request chain
   */
  setTraceId(traceId: string): void {
    this._traceId = traceId;
  }

  /**
   * Generate and set a new trace ID
   */
  newTraceId(): string {
    this._traceId = generateId();
    return this._traceId;
  }

  /**
   * Clear current trace ID
   */
  clearTraceId(): void {
    this._traceId = undefined;
  }

  /**
   * Get global context
   */
  get context(): Record<string, unknown> {
    return { ...this._context };
  }

  /**
   * Set global context values
   */
  setContext(context: Record<string, unknown>): void {
    this._context = { ...this._context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this._context = {};
  }

  /**
   * Run a function with a specific trace ID
   */
  withTrace<T>(fn: () => T): T {
    const prevTrace = this._traceId;
    this._traceId = generateId();
    try {
      return fn();
    } finally {
      this._traceId = prevTrace;
    }
  }

  /**
   * Run an async function with a specific trace ID
   */
  async withTraceAsync<T>(fn: () => Promise<T>): Promise<T> {
    const prevTrace = this._traceId;
    this._traceId = generateId();
    try {
      return await fn();
    } finally {
      this._traceId = prevTrace;
    }
  }
}

/**
 * Singleton logger context instance
 */
export const logContext = new LoggerContext();

/**
 * Generate a new trace ID
 */
export function generateTraceId(): string {
  return generateId();
}

/**
 * Trace ID decorator for async functions
 */
export function traced<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T
): T {
  return (async (...args: unknown[]) => {
    return logContext.withTraceAsync(() => fn(...args));
  }) as T;
}
