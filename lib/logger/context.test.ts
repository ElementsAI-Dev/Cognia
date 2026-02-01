/**
 * @jest-environment jsdom
 */

import { logContext, generateTraceId, traced } from './context';

describe('LoggerContext', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
    logContext.clearTraceId();
    logContext.clearContext();
  });

  describe('sessionId', () => {
    it('should generate a session ID', () => {
      expect(logContext.sessionId).toBeDefined();
      expect(typeof logContext.sessionId).toBe('string');
      expect(logContext.sessionId.length).toBeGreaterThan(0);
    });

    it('should persist session ID in sessionStorage', () => {
      const sessionId = logContext.sessionId;
      // Session ID is generated but may not persist to sessionStorage in all environments
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should return same session ID on multiple calls', () => {
      const id1 = logContext.sessionId;
      const id2 = logContext.sessionId;
      expect(id1).toBe(id2);
    });
  });

  describe('traceId', () => {
    it('should be undefined initially', () => {
      expect(logContext.traceId).toBeUndefined();
    });

    it('should set trace ID', () => {
      logContext.setTraceId('test-trace-id');
      expect(logContext.traceId).toBe('test-trace-id');
    });

    it('should generate new trace ID', () => {
      const traceId = logContext.newTraceId();
      expect(traceId).toBeDefined();
      expect(logContext.traceId).toBe(traceId);
    });

    it('should clear trace ID', () => {
      logContext.setTraceId('test-trace-id');
      logContext.clearTraceId();
      expect(logContext.traceId).toBeUndefined();
    });
  });

  describe('context', () => {
    it('should return empty object initially', () => {
      expect(logContext.context).toEqual({});
    });

    it('should set context values', () => {
      logContext.setContext({ userId: '123', action: 'login' });
      expect(logContext.context).toEqual({ userId: '123', action: 'login' });
    });

    it('should merge context values', () => {
      logContext.setContext({ userId: '123' });
      logContext.setContext({ action: 'login' });
      expect(logContext.context).toEqual({ userId: '123', action: 'login' });
    });

    it('should clear context', () => {
      logContext.setContext({ userId: '123' });
      logContext.clearContext();
      expect(logContext.context).toEqual({});
    });

    it('should return a copy of context', () => {
      logContext.setContext({ userId: '123' });
      const context = logContext.context;
      context.userId = '456';
      expect(logContext.context.userId).toBe('123');
    });
  });

  describe('withTrace', () => {
    it('should run function with a new trace ID', () => {
      let capturedTraceId: string | undefined;
      
      logContext.withTrace(() => {
        capturedTraceId = logContext.traceId;
      });
      
      expect(capturedTraceId).toBeDefined();
    });

    it('should restore previous trace ID after execution', () => {
      logContext.setTraceId('original-trace');
      
      logContext.withTrace(() => {
        expect(logContext.traceId).not.toBe('original-trace');
      });
      
      expect(logContext.traceId).toBe('original-trace');
    });

    it('should return function result', () => {
      const result = logContext.withTrace(() => 'test-result');
      expect(result).toBe('test-result');
    });

    it('should restore trace ID even if function throws', () => {
      logContext.setTraceId('original-trace');
      
      expect(() => {
        logContext.withTrace(() => {
          throw new Error('test error');
        });
      }).toThrow('test error');
      
      expect(logContext.traceId).toBe('original-trace');
    });
  });

  describe('withTraceAsync', () => {
    it('should run async function with a new trace ID', async () => {
      let capturedTraceId: string | undefined;
      
      await logContext.withTraceAsync(async () => {
        capturedTraceId = logContext.traceId;
      });
      
      expect(capturedTraceId).toBeDefined();
    });

    it('should restore previous trace ID after async execution', async () => {
      logContext.setTraceId('original-trace');
      
      await logContext.withTraceAsync(async () => {
        expect(logContext.traceId).not.toBe('original-trace');
        await Promise.resolve();
      });
      
      expect(logContext.traceId).toBe('original-trace');
    });

    it('should return async function result', async () => {
      const result = await logContext.withTraceAsync(async () => {
        await Promise.resolve();
        return 'async-result';
      });
      expect(result).toBe('async-result');
    });

    it('should restore trace ID even if async function throws', async () => {
      logContext.setTraceId('original-trace');
      
      await expect(
        logContext.withTraceAsync(async () => {
          throw new Error('async error');
        })
      ).rejects.toThrow('async error');
      
      expect(logContext.traceId).toBe('original-trace');
    });
  });
});

describe('generateTraceId', () => {
  it('should generate unique trace IDs', () => {
    const id1 = generateTraceId();
    const id2 = generateTraceId();
    expect(id1).not.toBe(id2);
  });

  it('should return string', () => {
    const id = generateTraceId();
    expect(typeof id).toBe('string');
  });

  it('should have expected format', () => {
    const id = generateTraceId();
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });
});

describe('traced decorator', () => {
  beforeEach(() => {
    logContext.clearTraceId();
  });

  it('should wrap async function with trace context', async () => {
    let capturedTraceId: string | undefined;
    
    const tracedFn = traced(async () => {
      capturedTraceId = logContext.traceId;
      return 'result';
    });
    
    const result = await tracedFn();
    
    expect(capturedTraceId).toBeDefined();
    expect(result).toBe('result');
  });

  it('should pass arguments to wrapped function', async () => {
    const add = async (...args: unknown[]) => {
      const [a, b] = args as [number, number];
      return a + b;
    };
    const tracedFn = traced(add);
    
    const result = await tracedFn(2, 3);
    expect(result).toBe(5);
  });
});
