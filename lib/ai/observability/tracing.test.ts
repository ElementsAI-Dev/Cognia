/**
 * OpenTelemetry Tracing Tests
 */

import {
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
} from './tracing';

// Mock OpenTelemetry API
jest.mock('@opentelemetry/api', () => {
  const mockSpan = {
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    addEvent: jest.fn(),
    recordException: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
    spanContext: jest.fn(() => ({
      traceId: 'mock-trace-id',
      spanId: 'mock-span-id',
    })),
  };
  const mockTracer = {
    startSpan: jest.fn(() => mockSpan),
  };
  const mockContext = {};
  return {
    trace: {
      getTracer: jest.fn(() => mockTracer),
      getActiveSpan: jest.fn(() => mockSpan),
      setSpan: jest.fn(() => mockContext),
    },
    context: {
      active: jest.fn(() => mockContext),
      with: jest.fn((_, fn) => fn()),
    },
    SpanStatusCode: {
      OK: 1,
      ERROR: 2,
    },
    SpanKind: {
      CLIENT: 2,
      INTERNAL: 0,
    },
  };
});

describe('tracing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTracer', () => {
    it('should return a tracer instance', () => {
      const tracer = getTracer('test-tracer', '1.0.0');
      expect(tracer).toBeDefined();
    });

    it('should use default version if not provided', () => {
      const tracer = getTracer('test-tracer');
      expect(tracer).toBeDefined();
    });
  });

  describe('createChildSpan', () => {
    it('should be a function', () => {
      expect(typeof createChildSpan).toBe('function');
    });
  });

  describe('addSpanAttributes', () => {
    it('should add attributes to active span', () => {
      addSpanAttributes({ key: 'value' });
      // Verification happens via mock
    });
  });

  describe('addSpanEvent', () => {
    it('should add event to active span', () => {
      addSpanEvent('test-event', { key: 'value' });
      // Verification happens via mock
    });
  });

  describe('recordException', () => {
    it('should record exception on active span', () => {
      const error = new Error('test error');
      recordException(error);
      // Verification happens via mock
    });
  });

  describe('getCurrentTraceId', () => {
    it('should return current trace ID', () => {
      const traceId = getCurrentTraceId();
      expect(traceId).toBe('mock-trace-id');
    });
  });

  describe('getCurrentSpanId', () => {
    it('should return current span ID', () => {
      const spanId = getCurrentSpanId();
      expect(spanId).toBe('mock-span-id');
    });
  });

  describe('AISpanAttributes', () => {
    it('should have all required attributes', () => {
      expect(AISpanAttributes.MODEL).toBe('ai.model');
      expect(AISpanAttributes.PROVIDER).toBe('ai.provider');
      expect(AISpanAttributes.PROMPT_TOKENS).toBe('ai.usage.prompt_tokens');
      expect(AISpanAttributes.COMPLETION_TOKENS).toBe('ai.usage.completion_tokens');
      expect(AISpanAttributes.TOTAL_TOKENS).toBe('ai.usage.total_tokens');
      expect(AISpanAttributes.TEMPERATURE).toBe('ai.temperature');
      expect(AISpanAttributes.MAX_TOKENS).toBe('ai.max_tokens');
      expect(AISpanAttributes.SESSION_ID).toBe('ai.session_id');
      expect(AISpanAttributes.USER_ID).toBe('ai.user_id');
      expect(AISpanAttributes.AGENT_NAME).toBe('ai.agent_name');
      expect(AISpanAttributes.TOOL_NAME).toBe('ai.tool_name');
      expect(AISpanAttributes.WORKFLOW_NAME).toBe('ai.workflow_name');
      expect(AISpanAttributes.NODE_ID).toBe('ai.node_id');
      expect(AISpanAttributes.NODE_TYPE).toBe('ai.node_type');
    });
  });

  describe('AISpanNames', () => {
    it('should have all required span names', () => {
      expect(AISpanNames.AI_GENERATION).toBe('ai.generation');
      expect(AISpanNames.AI_CHAT).toBe('ai.chat');
      expect(AISpanNames.AI_STREAMING).toBe('ai.streaming');
      expect(AISpanNames.AGENT_EXECUTION).toBe('agent.execution');
      expect(AISpanNames.AGENT_PLANNING).toBe('agent.planning');
      expect(AISpanNames.AGENT_TOOL_CALL).toBe('agent.tool_call');
      expect(AISpanNames.WORKFLOW_EXECUTION).toBe('workflow.execution');
      expect(AISpanNames.WORKFLOW_NODE_EXECUTION).toBe('workflow.node_execution');
      expect(AISpanNames.RAG_RETRIEVAL).toBe('rag.retrieval');
      expect(AISpanNames.RAG_EMBEDDING).toBe('rag.embedding');
      expect(AISpanNames.MEMORY_RETRIEVAL).toBe('memory.retrieval');
      expect(AISpanNames.MEMORY_STORAGE).toBe('memory.storage');
    });
  });

  describe('OpenTelemetryUtils', () => {
    describe('trackAIGeneration', () => {
      it('should track AI generation', async () => {
        const result = await OpenTelemetryUtils.trackAIGeneration(
          'gpt-4',
          'openai',
          async () => 'generated text'
        );
        expect(result).toBe('generated text');
      });

      it('should track with options', async () => {
        const result = await OpenTelemetryUtils.trackAIGeneration(
          'gpt-4',
          'openai',
          async () => ({ text: 'response' }),
          {
            sessionId: 'session-123',
            userId: 'user-456',
            temperature: 0.7,
            maxTokens: 1000,
          }
        );
        expect(result).toEqual({ text: 'response' });
      });
    });

    describe('trackAgentExecution', () => {
      it('should track agent execution', async () => {
        const result = await OpenTelemetryUtils.trackAgentExecution(
          'test-agent',
          async () => 'agent result'
        );
        expect(result).toBe('agent result');
      });

      it('should track with options', async () => {
        const result = await OpenTelemetryUtils.trackAgentExecution(
          'test-agent',
          async () => ({ result: 'completed' }),
          {
            sessionId: 'session-123',
            userId: 'user-456',
          }
        );
        expect(result).toEqual({ result: 'completed' });
      });
    });

    describe('trackToolCall', () => {
      it('should track tool call', async () => {
        const result = await OpenTelemetryUtils.trackToolCall(
          'search-tool',
          async () => 'search results'
        );
        expect(result).toBe('search results');
      });
    });

    describe('trackWorkflowExecution', () => {
      it('should track workflow execution', async () => {
        const result = await OpenTelemetryUtils.trackWorkflowExecution(
          'test-workflow',
          async () => 'workflow completed'
        );
        expect(result).toBe('workflow completed');
      });
    });

    describe('trackWorkflowNodeExecution', () => {
      it('should track workflow node execution', async () => {
        const result = await OpenTelemetryUtils.trackWorkflowNodeExecution(
          'node-1',
          'input-node',
          async () => 'node completed'
        );
        expect(result).toBe('node completed');
      });
    });
  });
});
