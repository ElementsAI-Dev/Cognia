/**
 * Tests for Background Agent Event System
 */

import {
  BackgroundAgentEventEmitter,
  getBackgroundAgentEventEmitter,
  createBackgroundAgentEventEmitter,
  type AgentCheckpoint,
  type HealthWarning,
  type ExecutionStatistics,
} from './background-agent-events';
import type { BackgroundAgent, BackgroundAgentResult } from '@/types/agent/background-agent';

describe('BackgroundAgentEventEmitter', () => {
  let emitter: BackgroundAgentEventEmitter;

  beforeEach(() => {
    emitter = new BackgroundAgentEventEmitter();
  });

  describe('on/off', () => {
    it('should subscribe to events', () => {
      const listener = jest.fn();
      emitter.on('agent:created', listener);

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:created', { agent: mockAgent });

      expect(listener).toHaveBeenCalledWith({ agent: mockAgent });
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = emitter.on('agent:created', listener);

      unsubscribe();

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:created', { agent: mockAgent });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should unsubscribe with off method', () => {
      const listener = jest.fn();
      emitter.on('agent:started', listener);
      emitter.off('agent:started', listener);

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:started', { agent: mockAgent });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners for same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('agent:completed', listener1);
      emitter.on('agent:completed', listener2);

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      const mockResult = { success: true } as BackgroundAgentResult;
      emitter.emit('agent:completed', { agent: mockAgent, result: mockResult });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('onAll', () => {
    it('should subscribe to all events', () => {
      const wildcardListener = jest.fn();
      emitter.onAll(wildcardListener);

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:created', { agent: mockAgent });
      emitter.emit('agent:started', { agent: mockAgent });

      expect(wildcardListener).toHaveBeenCalledTimes(2);
      expect(wildcardListener).toHaveBeenCalledWith('agent:created', { agent: mockAgent });
      expect(wildcardListener).toHaveBeenCalledWith('agent:started', { agent: mockAgent });
    });

    it('should return unsubscribe function for wildcard listener', () => {
      const wildcardListener = jest.fn();
      const unsubscribe = emitter.onAll(wildcardListener);

      unsubscribe();

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:created', { agent: mockAgent });

      expect(wildcardListener).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should emit events to listeners', () => {
      const listener = jest.fn();
      emitter.on('agent:progress', listener);

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:progress', { agent: mockAgent, progress: 50, phase: 'executing' });

      expect(listener).toHaveBeenCalledWith({
        agent: mockAgent,
        progress: 50,
        phase: 'executing',
      });
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = jest.fn();

      emitter.on('agent:failed', errorListener);
      emitter.on('agent:failed', normalListener);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:failed', { agent: mockAgent, error: 'test error' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle wildcard listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Wildcard error');
      });

      emitter.onAll(errorListener);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:created', { agent: mockAgent });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('once', () => {
    it('should resolve when event is emitted', async () => {
      const mockAgent = { id: 'test-agent' } as BackgroundAgent;

      setTimeout(() => {
        emitter.emit('agent:started', { agent: mockAgent });
      }, 10);

      const result = await emitter.once('agent:started');

      expect(result).toEqual({ agent: mockAgent });
    });

    it('should reject on timeout', async () => {
      await expect(emitter.once('agent:completed', 50)).rejects.toThrow(
        'Timeout waiting for event: agent:completed'
      );
    });

    it('should only trigger once', async () => {
      const mockAgent = { id: 'test-agent' } as BackgroundAgent;

      setTimeout(() => {
        emitter.emit('agent:started', { agent: mockAgent });
        emitter.emit('agent:started', { agent: mockAgent });
      }, 10);

      const result = await emitter.once('agent:started');

      expect(result).toEqual({ agent: mockAgent });
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on('agent:created', listener1);
      emitter.on('agent:started', listener2);

      emitter.removeAllListeners('agent:created');

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:created', { agent: mockAgent });
      emitter.emit('agent:started', { agent: mockAgent });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const wildcardListener = jest.fn();

      emitter.on('agent:created', listener1);
      emitter.on('agent:started', listener2);
      emitter.onAll(wildcardListener);

      emitter.removeAllListeners();

      const mockAgent = { id: 'test-agent' } as BackgroundAgent;
      emitter.emit('agent:created', { agent: mockAgent });
      emitter.emit('agent:started', { agent: mockAgent });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(wildcardListener).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct listener count', () => {
      expect(emitter.listenerCount('agent:created')).toBe(0);

      emitter.on('agent:created', jest.fn());
      expect(emitter.listenerCount('agent:created')).toBe(1);

      emitter.on('agent:created', jest.fn());
      expect(emitter.listenerCount('agent:created')).toBe(2);
    });

    it('should return 0 for events with no listeners', () => {
      expect(emitter.listenerCount('agent:failed')).toBe(0);
    });
  });
});

describe('Global Event Emitter', () => {
  it('should return singleton instance', () => {
    const emitter1 = getBackgroundAgentEventEmitter();
    const emitter2 = getBackgroundAgentEventEmitter();

    expect(emitter1).toBe(emitter2);
  });

  it('should create new instance with createBackgroundAgentEventEmitter', () => {
    const emitter1 = createBackgroundAgentEventEmitter();
    const emitter2 = createBackgroundAgentEventEmitter();

    expect(emitter1).not.toBe(emitter2);
  });
});

describe('Type Definitions', () => {
  it('should have correct AgentCheckpoint structure', () => {
    const checkpoint: AgentCheckpoint = {
      id: 'checkpoint-1',
      agentId: 'agent-1',
      timestamp: new Date(),
      currentStep: 2,
      currentPhase: 'executing',
      completedSubAgents: ['sub-1'],
      pendingSubAgents: ['sub-2'],
      accumulatedContext: { key: 'value' },
      partialResults: { result: 'partial' },
      conversationHistory: [{ role: 'user', content: 'test' }],
    };

    expect(checkpoint.currentPhase).toBe('executing');
  });

  it('should have correct HealthWarning structure', () => {
    const warning: HealthWarning = {
      type: 'stalled',
      message: 'Agent is stalled',
      timestamp: new Date(),
      metrics: { duration: 1000 },
    };

    expect(warning.type).toBe('stalled');
  });

  it('should have correct ExecutionStatistics structure', () => {
    const stats: ExecutionStatistics = {
      agentId: 'agent-1',
      totalDuration: 5000,
      planningDuration: 1000,
      executionDuration: 3000,
      aggregationDuration: 1000,
      totalSteps: 10,
      completedSteps: 8,
      failedSteps: 2,
      totalSubAgents: 5,
      completedSubAgents: 4,
      failedSubAgents: 1,
      totalToolCalls: 20,
      successfulToolCalls: 18,
      failedToolCalls: 2,
      retryCount: 3,
      averageStepDuration: 300,
    };

    expect(stats.totalSteps).toBe(10);
  });
});
