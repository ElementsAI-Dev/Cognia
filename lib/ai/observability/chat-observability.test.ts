/**
 * Chat Observability Tests
 */

import {
  ChatObservabilityManager,
  createChatObservabilityManager,
  type ChatObservabilityConfig,
} from './chat-observability';

// Mock dependencies
jest.mock('./langfuse-client', () => ({
  createChatTrace: jest.fn(() => ({
    id: 'mock-trace-id',
    update: jest.fn(),
    generation: jest.fn(() => ({
      update: jest.fn(),
      end: jest.fn(),
    })),
    span: jest.fn(() => ({
      update: jest.fn(),
      end: jest.fn(),
    })),
  })),
  createGeneration: jest.fn(() => ({
    update: jest.fn(),
    end: jest.fn(),
  })),
  createGenerationWithErrorHandling: jest.fn(async (_trace, _options, fn) => fn()),
  flushLangfuse: jest.fn().mockResolvedValue(undefined),
  getTraceUrl: jest.fn((id) => `https://langfuse.com/trace/${id}`),
}));

jest.mock('./tracing', () => ({
  createChildSpan: jest.fn(() => ({
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    addEvent: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
    spanContext: jest.fn(() => ({
      traceId: 'mock-trace-id',
      spanId: 'mock-span-id',
    })),
  })),
  OpenTelemetryUtils: {
    trackAIGeneration: jest.fn(async (_model, _provider, fn) => fn()),
  },
  AISpanAttributes: {
    MODEL: 'ai.model',
    PROVIDER: 'ai.provider',
  },
  AISpanNames: {
    AI_GENERATION: 'ai.generation',
    AI_CHAT: 'ai.chat',
  },
}));

describe('chat-observability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChatObservabilityManager', () => {
    it('should create a manager instance', () => {
      const config: ChatObservabilityConfig = {
        sessionId: 'session-123',
        userId: 'user-456',
        enableLangfuse: true,
        enableOpenTelemetry: true,
      };
      const manager = createChatObservabilityManager(config);
      expect(manager).toBeInstanceOf(ChatObservabilityManager);
    });

    it('should create manager with minimal config', () => {
      const config: ChatObservabilityConfig = {
        sessionId: 'session-123',
      };
      const manager = createChatObservabilityManager(config);
      expect(manager).toBeInstanceOf(ChatObservabilityManager);
    });
  });

  describe('ChatObservabilityManager', () => {
    let manager: ChatObservabilityManager;

    beforeEach(() => {
      manager = createChatObservabilityManager({
        sessionId: 'session-123',
        userId: 'user-456',
        enableLangfuse: true,
        enableOpenTelemetry: true,
        metadata: { key: 'value' },
      });
    });

    describe('startChat', () => {
      it('should start chat tracking', () => {
        manager.startChat();
        // Should create trace via Langfuse
      });
    });

    describe('endChat', () => {
      it('should end chat tracking', async () => {
        manager.startChat();
        await manager.endChat();
        // Should flush and cleanup
      });
    });

    describe('trackGeneration', () => {
      it('should track a generation', async () => {
        manager.startChat();
        
        const result = await manager.trackGeneration(
          'gpt-4',
          'openai',
          [{ role: 'user' as const, content: 'Hello' }],
          async () => ({ text: 'Hi there!', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } })
        );
        
        expect(result).toEqual({
          text: 'Hi there!',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        });
      });

      it('should track generation with options', async () => {
        manager.startChat();
        
        const result = await manager.trackGeneration(
          'gpt-4',
          'openai',
          [{ role: 'user' as const, content: 'Hello' }],
          async () => ({ text: 'Response' }),
          { temperature: 0.7, maxTokens: 1000, topP: 0.9 }
        );
        
        expect(result.text).toBe('Response');
      });

      it('should handle errors during generation', async () => {
        manager.startChat();
        
        await expect(
          manager.trackGeneration(
            'gpt-4',
            'openai',
            [{ role: 'user' as const, content: 'Hello' }],
            async () => {
              throw new Error('Generation failed');
            }
          )
        ).rejects.toThrow('Generation failed');
      });
    });

    describe('trackStreamingGeneration', () => {
      it('should return streaming tracker', () => {
        manager.startChat();
        
        const tracker = manager.trackStreamingGeneration(
          'gpt-4',
          'openai',
          [{ role: 'user' as const, content: 'Hello' }]
        );
        
        expect(tracker).toBeDefined();
        if (tracker) {
          expect(tracker.end).toBeInstanceOf(Function);
        }
      });

      it('should track streaming with options', () => {
        manager.startChat();
        
        const tracker = manager.trackStreamingGeneration(
          'gpt-4',
          'openai',
          [{ role: 'user' as const, content: 'Hello' }],
          { temperature: 0.7, maxTokens: 1000 }
        );
        
        expect(tracker).toBeDefined();
      });

      it('should end streaming tracker', () => {
        manager.startChat();
        
        const tracker = manager.trackStreamingGeneration(
          'gpt-4',
          'openai',
          [{ role: 'user' as const, content: 'Hello' }]
        );
        
        if (tracker) {
          tracker.end('Final response', { promptTokens: 10, completionTokens: 20, totalTokens: 30 });
        }
        // Should update generation with final output
      });
    });

    describe('getTraceUrl', () => {
      it('should be a method on manager', () => {
        expect(typeof manager.getTraceUrl).toBe('function');
      });

      it('should return null before starting chat', () => {
        const url = manager.getTraceUrl();
        expect(url).toBeNull();
      });
    });
  });

  describe('Manager without Langfuse', () => {
    it('should work without Langfuse enabled', async () => {
      const manager = createChatObservabilityManager({
        sessionId: 'session-123',
        enableLangfuse: false,
        enableOpenTelemetry: true,
      });

      manager.startChat();
      
      const result = await manager.trackGeneration(
        'gpt-4',
        'openai',
        [{ role: 'user' as const, content: 'Hello' }],
        async () => ({ text: 'Response' })
      );
      
      expect(result.text).toBe('Response');
    });
  });

  describe('Manager without OpenTelemetry', () => {
    it('should work without OpenTelemetry enabled', async () => {
      const manager = createChatObservabilityManager({
        sessionId: 'session-123',
        enableLangfuse: true,
        enableOpenTelemetry: false,
      });

      manager.startChat();
      
      const result = await manager.trackGeneration(
        'gpt-4',
        'openai',
        [{ role: 'user' as const, content: 'Hello' }],
        async () => ({ text: 'Response' })
      );
      
      expect(result.text).toBe('Response');
    });
  });
});
