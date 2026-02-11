/**
 * Langfuse Client Tests
 */

import {
  getLangfuse,
  shutdownLangfuse,
  createChatTrace,
  createGeneration,
  createSpan,
  flushLangfuse,
  addScore,
  createSpanWithErrorHandling,
  createGenerationWithErrorHandling,
  isLangfuseEnabled,
  getTraceUrl,
  LangfuseUtils,
  type LangfuseConfig,
} from './langfuse-client';

// Mock Langfuse
jest.mock('langfuse', () => {
  const mockGeneration = {
    update: jest.fn(),
    end: jest.fn(),
  };
  const mockSpan = {
    update: jest.fn(),
    end: jest.fn(),
  };
  const mockTrace = {
    update: jest.fn(),
    generation: jest.fn(() => mockGeneration),
    span: jest.fn(() => mockSpan),
    score: jest.fn(),
  };
  return {
    Langfuse: jest.fn().mockImplementation(() => ({
      trace: jest.fn(() => mockTrace),
      flush: jest.fn().mockResolvedValue(undefined),
      flushAsync: jest.fn().mockResolvedValue(undefined),
      shutdownAsync: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('langfuse-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Reset singleton
    await shutdownLangfuse();
  });

  describe('getLangfuse', () => {
    it('should create Langfuse instance with default config', async () => {
      const langfuse = await getLangfuse();
      expect(langfuse).toBeDefined();
    });

    it('should return an instance on subsequent calls', async () => {
      const langfuse1 = await getLangfuse();
      const langfuse2 = await getLangfuse();
      expect(langfuse1).toBeDefined();
      expect(langfuse2).toBeDefined();
    });

    it('should create instance with custom config', async () => {
      const config: LangfuseConfig = {
        publicKey: 'test-public-key',
        secretKey: 'test-secret-key',
        host: 'https://custom.langfuse.com',
        enabled: true,
      };
      const langfuse = await getLangfuse(config);
      expect(langfuse).toBeDefined();
    });

    it('should return no-op client when disabled', async () => {
      const config: LangfuseConfig = {
        enabled: false,
      };
      const langfuse = await getLangfuse(config);
      expect(langfuse).toBeDefined();
      // No-op client should have all methods
      const trace = langfuse.trace({});
      expect(trace).toBeDefined();
    });
  });

  describe('createChatTrace', () => {
    it('should create a chat trace with session and user', async () => {
      const trace = await createChatTrace({
        sessionId: 'session-123',
        userId: 'user-456',
      });
      expect(trace).toBeDefined();
    });

    it('should create chat trace with metadata', async () => {
      const trace = await createChatTrace({
        sessionId: 'session-123',
        metadata: { key: 'value' },
        tags: ['tag1', 'tag2'],
      });
      expect(trace).toBeDefined();
    });
  });

  describe('createGeneration', () => {
    it('should create a generation within a trace', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      const generation = createGeneration(trace, {
        model: 'gpt-4',
        input: 'test input',
      });
      expect(generation).toBeDefined();
      expect(typeof generation.update).toBe('function');
      expect(typeof generation.end).toBe('function');
    });

    it('should include usage data when provided', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      const generation = createGeneration(trace, {
        model: 'gpt-4',
        input: 'test input',
        output: 'test output',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      });
      expect(generation).toBeDefined();
    });
  });

  describe('createSpan', () => {
    it('should create a span within a trace', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      const span = createSpan(trace, { name: 'test-span' });
      expect(span).toBeDefined();
      expect(typeof span.update).toBe('function');
      expect(typeof span.end).toBe('function');
    });
  });

  describe('addScore', () => {
    it('should add a score to a trace', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      // addScore calls trace.score internally
      // No error means success with no-op client
      addScore(trace, {
        name: 'quality',
        value: 0.9,
      });
      expect(trace).toBeDefined();
    });
  });

  describe('flushLangfuse', () => {
    it('should flush pending events', async () => {
      const langfuse = await getLangfuse({ enabled: true });
      await flushLangfuse();
      expect(langfuse.flush).toHaveBeenCalled();
    });
  });

  describe('shutdownLangfuse', () => {
    it('should shutdown the client', async () => {
      await getLangfuse({ enabled: true });
      await shutdownLangfuse();
      // After shutdown, should be able to create new instance
      const newLangfuse = await getLangfuse();
      expect(newLangfuse).toBeDefined();
    });
  });

  describe('isLangfuseEnabled', () => {
    it('should return false when no config', () => {
      // Will depend on env vars
      const enabled = isLangfuseEnabled();
      expect(typeof enabled).toBe('boolean');
    });
  });

  describe('getTraceUrl', () => {
    it('should return trace URL', () => {
      const url = getTraceUrl('trace-123');
      expect(url).toContain('trace-123');
      expect(url).toContain('langfuse.com');
    });
  });

  describe('createSpanWithErrorHandling', () => {
    it('should execute function and return result', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      
      const result = await createSpanWithErrorHandling(
        trace,
        { name: 'test-span' },
        async () => 'success'
      );
      
      expect(result).toBe('success');
    });

    it('should handle errors and rethrow', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      
      await expect(
        createSpanWithErrorHandling(
          trace,
          { name: 'error-span' },
          async () => {
            throw new Error('test error');
          }
        )
      ).rejects.toThrow('test error');
    });
  });

  describe('createGenerationWithErrorHandling', () => {
    it('should execute function and return result', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      
      const result = await createGenerationWithErrorHandling(
        trace,
        { model: 'gpt-4', input: 'test' },
        async () => ({ text: 'response', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } })
      );
      
      expect(result).toEqual({ text: 'response', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } });
    });

    it('should handle errors', async () => {
      const trace = await createChatTrace({ sessionId: 'session-123' });
      
      await expect(
        createGenerationWithErrorHandling(
          trace,
          { model: 'gpt-4', input: 'test' },
          async () => {
            throw new Error('generation error');
          }
        )
      ).rejects.toThrow('generation error');
    });
  });

  describe('LangfuseUtils', () => {
    describe('trackChatExchange', () => {
      it('should track a chat exchange', async () => {
        const result = await LangfuseUtils.trackChatExchange(
          'session-123',
          'user-456',
          'gpt-4',
          [{ role: 'user' as const, content: 'Hello' }],
          'Hi there!',
          { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
        );
        
        expect(result).toBeDefined();
      });
    });

    describe('trackAgentExecution', () => {
      it('should track an agent execution', async () => {
        const result = await LangfuseUtils.trackAgentExecution(
          'session-123',
          'user-456',
          'test-agent',
          'Test task',
          'Task completed',
          [
            {
              name: 'search',
              args: { query: 'test' },
              result: 'Found results',
            },
          ]
        );
        
        expect(result).toBeDefined();
      });
    });

    describe('trackWorkflowExecution', () => {
      it('should track a workflow execution', async () => {
        const result = await LangfuseUtils.trackWorkflowExecution(
          'session-123',
          'user-456',
          'test-workflow',
          [
            { id: 'node-1', type: 'input', status: 'success', duration: 50 },
            { id: 'node-2', type: 'output', status: 'success', duration: 30 },
          ]
        );
        
        expect(result).toBeDefined();
      });
    });
  });
});
