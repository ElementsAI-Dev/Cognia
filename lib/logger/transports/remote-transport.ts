/**
 * Remote Transport
 * Ships logs to remote endpoints with batching and retry
 */

import type { StructuredLogEntry, Transport } from '../types';

/**
 * Remote transport options
 */
export interface RemoteTransportOptions {
  /** Remote endpoint URL */
  endpoint: string;
  /** Batch size before sending */
  batchSize?: number;
  /** Flush interval in milliseconds */
  flushInterval?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Transform entries before sending */
  transform?: (entries: StructuredLogEntry[]) => unknown;
}

const DEFAULT_OPTIONS: Omit<RemoteTransportOptions, 'endpoint'> = {
  batchSize: 50,
  flushInterval: 5000,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
};

/**
 * Remote transport implementation
 */
export class RemoteTransport implements Transport {
  name = 'remote';
  private options: RemoteTransportOptions;
  private buffer: StructuredLogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryQueue: StructuredLogEntry[] = [];
  private isOnline = true;

  constructor(options: RemoteTransportOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startFlushTimer();
    this.setupOnlineListener();
  }

  /**
   * Setup online/offline listener
   */
  private setupOnlineListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushRetryQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  /**
   * Log entry to buffer
   */
  log(entry: StructuredLogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= (this.options.batchSize || 50)) {
      this.flush();
    }
  }

  /**
   * Flush buffer to remote
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    await this.send(entries);
  }

  /**
   * Send entries to remote with retry
   */
  private async send(entries: StructuredLogEntry[], attempt = 0): Promise<void> {
    if (!this.isOnline) {
      this.retryQueue.push(...entries);
      return;
    }

    try {
      const body = this.options.transform 
        ? this.options.transform(entries)
        : entries;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const maxRetries = this.options.maxRetries || 3;
      
      if (attempt < maxRetries) {
        const delay = (this.options.retryDelay || 1000) * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.send(entries, attempt + 1);
      }

      // Add to retry queue after max retries
      this.retryQueue.push(...entries);
      console.error('Failed to send logs after retries:', error);
    }
  }

  /**
   * Flush retry queue when back online
   */
  private async flushRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    const entries = [...this.retryQueue];
    this.retryQueue = [];

    const batchSize = this.options.batchSize || 50;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await this.send(batch);
    }
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.buffer.length + this.retryQueue.length;
  }

  /**
   * Close transport
   */
  async close(): Promise<void> {
    await this.flush();
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

/**
 * Create remote transport
 */
export function createRemoteTransport(options: RemoteTransportOptions): RemoteTransport {
  return new RemoteTransport(options);
}

/**
 * Sentry-compatible transform
 */
export function sentryTransform(entries: StructuredLogEntry[]): unknown {
  return entries.map(entry => ({
    level: entry.level === 'fatal' ? 'fatal' : entry.level,
    message: entry.message,
    timestamp: entry.timestamp,
    extra: {
      module: entry.module,
      traceId: entry.traceId,
      sessionId: entry.sessionId,
      ...entry.data,
    },
    tags: {
      module: entry.module,
      ...(entry.tags?.reduce((acc, tag) => ({ ...acc, [tag]: true }), {}) || {}),
    },
  }));
}

/**
 * Loggly-compatible transform
 */
export function logglyTransform(entries: StructuredLogEntry[]): unknown {
  return entries.map(entry => ({
    level: entry.level,
    message: entry.message,
    timestamp: entry.timestamp,
    tag: entry.module,
    traceId: entry.traceId,
    sessionId: entry.sessionId,
    data: entry.data,
  }));
}
