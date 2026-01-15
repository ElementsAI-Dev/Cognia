/**
 * Agent Observability Tests
 */

import {
  AgentObservabilityManager,
  createAgentObservabilityManager,
  type AgentObservabilityConfig,
} from './agent-observability';

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
  createSpan: jest.fn(() => ({
    update: jest.fn(),
    end: jest.fn(),
  })),
  createGeneration: jest.fn(() => ({
    update: jest.fn(),
    end: jest.fn(),
  })),
  createSpanWithErrorHandling: jest.fn(async (_trace, _options, fn) => fn()),
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
    trackAgentExecution: jest.fn(async (_name, fn) => fn()),
    trackToolCall: jest.fn(async (_name, fn) => fn()),
  },
  AISpanAttributes: {
    AGENT_NAME: 'ai.agent.name',
    TOOL_NAME: 'ai.tool.name',
  },
  AISpanNames: {
    AGENT_EXECUTION: 'agent.execution',
    AGENT_PLANNING: 'agent.planning',
    AGENT_TOOL_CALL: 'agent.tool_call',
  },
}));

describe('agent-observability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgentObservabilityManager', () => {
    it('should create a manager instance', () => {
      const config: AgentObservabilityConfig = {
        sessionId: 'session-123',
        userId: 'user-456',
        agentName: 'test-agent',
        task: 'Test task',
        enableLangfuse: true,
        enableOpenTelemetry: true,
      };
      const manager = createAgentObservabilityManager(config);
      expect(manager).toBeInstanceOf(AgentObservabilityManager);
    });

    it('should create manager with minimal config', () => {
      const config: AgentObservabilityConfig = {
        sessionId: 'session-123',
        agentName: 'test-agent',
        task: 'Test task',
      };
      const manager = createAgentObservabilityManager(config);
      expect(manager).toBeInstanceOf(AgentObservabilityManager);
    });
  });

  describe('AgentObservabilityManager', () => {
    let manager: AgentObservabilityManager;

    beforeEach(() => {
      manager = createAgentObservabilityManager({
        sessionId: 'session-123',
        userId: 'user-456',
        agentName: 'test-agent',
        task: 'Test task',
        enableLangfuse: true,
        enableOpenTelemetry: true,
        metadata: { key: 'value' },
      });
    });

    describe('startAgentExecution', () => {
      it('should start agent execution tracking', () => {
        manager.startAgentExecution();
        // Should create trace via Langfuse
      });
    });

    describe('endAgentExecution', () => {
      it('should end agent execution tracking', async () => {
        manager.startAgentExecution();
        await manager.endAgentExecution('Task completed', []);
        // Should flush and cleanup
      });

      it('should include tool calls in result', async () => {
        manager.startAgentExecution();
        await manager.endAgentExecution('Task completed', []);
      });
    });

    describe('trackAgentExecution', () => {
      it('should track agent execution', async () => {
        manager.startAgentExecution();
        
        const result = await manager.trackAgentExecution(async () => 'execution result');
        
        expect(result).toBe('execution result');
      });

      it('should handle errors', async () => {
        manager.startAgentExecution();
        
        await expect(
          manager.trackAgentExecution(async () => {
            throw new Error('Execution failed');
          })
        ).rejects.toThrow('Execution failed');
      });
    });

    describe('trackToolCall', () => {
      it('should track a tool call', async () => {
        manager.startAgentExecution();
        
        const result = await manager.trackToolCall(
          'search',
          { query: 'test' },
          async () => ({ results: ['item1', 'item2'] })
        );
        
        expect(result).toEqual({ results: ['item1', 'item2'] });
      });

      it('should handle tool errors', async () => {
        manager.startAgentExecution();
        
        await expect(
          manager.trackToolCall(
            'search',
            { query: 'test' },
            async () => {
              throw new Error('Tool failed');
            }
          )
        ).rejects.toThrow('Tool failed');
      });
    });

    describe('trackToolCalls', () => {
      it('should be a method on manager', () => {
        expect(typeof manager.trackToolCalls).toBe('function');
      });
    });

    describe('trackPlanning', () => {
      it('should be a method on manager', () => {
        expect(typeof manager.trackPlanning).toBe('function');
      });
    });

    describe('getTraceUrl', () => {
      it('should be a method on manager', () => {
        expect(typeof manager.getTraceUrl).toBe('function');
      });

      it('should return null before starting', () => {
        const url = manager.getTraceUrl();
        expect(url).toBeNull();
      });
    });
  });

  describe('Manager without Langfuse', () => {
    it('should work without Langfuse enabled', async () => {
      const manager = createAgentObservabilityManager({
        sessionId: 'session-123',
        agentName: 'test-agent',
        task: 'Test task',
        enableLangfuse: false,
        enableOpenTelemetry: true,
      });

      manager.startAgentExecution();
      
      const result = await manager.trackToolCall(
        'search',
        { query: 'test' },
        async () => 'result'
      );
      
      expect(result).toBe('result');
    });
  });

  describe('Manager without OpenTelemetry', () => {
    it('should work without OpenTelemetry enabled', async () => {
      const manager = createAgentObservabilityManager({
        sessionId: 'session-123',
        agentName: 'test-agent',
        task: 'Test task',
        enableLangfuse: true,
        enableOpenTelemetry: false,
      });

      manager.startAgentExecution();
      
      const result = await manager.trackToolCall(
        'search',
        { query: 'test' },
        async () => 'result'
      );
      
      expect(result).toBe('result');
    });
  });
});
