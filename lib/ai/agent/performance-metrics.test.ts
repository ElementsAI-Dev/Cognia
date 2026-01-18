/**
 * Performance Metrics - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import MetricsCollector from './performance-metrics';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  afterEach(() => {
    collector.clear();
  });

  describe('Execution Lifecycle', () => {
    it('should start and end execution tracking', () => {
      const executionId = collector.startExecution('test-exec-123', 'session-123');

      expect(executionId).toBe('test-exec-123');

      const metrics = collector.endExecution(executionId, 'stop');

      expect(metrics).not.toBeNull();
      expect(metrics?.executionId).toBe('test-exec-123');
      expect(metrics?.sessionId).toBe('session-123');
      expect(metrics?.totalDuration).toBeGreaterThan(0);
      expect(metrics?.stopReason).toBe('stop');
    });

    it('should generate unique execution IDs if not provided', () => {
      const id1 = collector.startExecution();
      const id2 = collector.startExecution();

      expect(id1).not.toBe(id2);
    });

    it('should return null for non-existent execution', () => {
      const metrics = collector.getMetrics('non-existent');
      expect(metrics).toBeNull();
    });

    it('should track active executions', () => {
      collector.startExecution('exec-1');
      collector.startExecution('exec-2');

      const active = collector.getActiveExecutions();

      expect(active.length).toBe(2);
      expect(active[0].executionId).toBe('exec-1');
      expect(active[1].executionId).toBe('exec-2');
    });

    it('should maintain execution history', () => {
      collector.startExecution('exec-1');
      collector.endExecution('exec-1');

      const history = collector.getHistory();

      expect(history.length).toBe(1);
      expect(history[0].executionId).toBe('exec-1');
    });

    it('should limit history size', () => {
      const smallCollector = new MetricsCollector();
      // Override maxHistorySize by creating multiple executions
      for (let i = 0; i < 105; i++) {
        const id = smallCollector.startExecution(`exec-${i}`);
        smallCollector.endExecution(id);
      }

      const history = smallCollector.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Step Metrics', () => {
    it('should record step metrics', () => {
      const executionId = collector.startExecution();
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 100);

      collector.recordStep(
        executionId,
        1,
        startTime,
        endTime,
        [],
        'stop'
      );

      const metrics = collector.getMetrics(executionId);

      expect(metrics?.steps.length).toBe(1);
      expect(metrics?.steps[0].stepNumber).toBe(1);
      expect(metrics?.steps[0].duration).toBe(100);
      expect(metrics?.steps[0].toolCallCount).toBe(0);
    });

    it('should record token usage', () => {
      const executionId = collector.startExecution();

      collector.recordTokenUsage(executionId, 1, 100, 200);

      const metrics = collector.getMetrics(executionId);

      expect(metrics?.tokenUsage.promptTokens).toBe(100);
      expect(metrics?.tokenUsage.completionTokens).toBe(200);
      expect(metrics?.tokenUsage.totalTokens).toBe(300);
    });

    it('should aggregate token usage across steps', () => {
      const executionId = collector.startExecution();

      collector.recordTokenUsage(executionId, 1, 100, 200);
      collector.recordTokenUsage(executionId, 2, 150, 250);

      const metrics = collector.getMetrics(executionId);

      expect(metrics?.tokenUsage.promptTokens).toBe(250);
      expect(metrics?.tokenUsage.completionTokens).toBe(450);
      expect(metrics?.tokenUsage.totalTokens).toBe(700);
    });
  });

  describe('Tool Call Metrics', () => {
    it('should record tool call metrics', () => {
      const executionId = collector.startExecution();
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 50);

      collector.recordToolCall(
        executionId,
        'tool-1',
        'test_tool',
        { param: 'value' },
        startTime,
        endTime,
        true,
        false,
        undefined,
        0
      );

      const metrics = collector.getMetrics(executionId);

      expect(metrics?.toolCalls.length).toBe(1);
      expect(metrics?.toolCalls[0].toolName).toBe('test_tool');
      expect(metrics?.toolCalls[0].duration).toBe(50);
      expect(metrics?.toolCalls[0].success).toBe(true);
      expect(metrics?.toolCalls[0].cached).toBe(false);
    });

    it('should track cache hits and misses', () => {
      const executionId = collector.startExecution();
      const startTime = new Date();
      const endTime = new Date();

      // Record a cached tool call
      collector.recordToolCall(
        executionId,
        'tool-1',
        'test_tool',
        { param: 'value' },
        startTime,
        endTime,
        true,
        true,
        undefined,
        0
      );

      // Record a non-cached tool call
      collector.recordToolCall(
        executionId,
        'tool-2',
        'test_tool',
        { param: 'value' },
        startTime,
        endTime,
        true,
        false,
        undefined,
        0
      );

      const metrics = collector.getMetrics(executionId);

      expect(metrics?.cacheStats.hits).toBe(1);
      expect(metrics?.cacheStats.misses).toBe(1);
      expect(metrics?.cacheStats.hitRate).toBe(0.5);
      expect(metrics?.cacheStats.savedCalls).toBe(1);
    });

    it('should track errors', () => {
      const executionId = collector.startExecution();
      const startTime = new Date();
      const endTime = new Date();

      collector.recordToolCall(
        executionId,
        'tool-1',
        'test_tool',
        { param: 'value' },
        startTime,
        endTime,
        false,
        false,
        'Error occurred',
        0
      );

      const metrics = collector.getMetrics(executionId);

      expect(metrics?.errorCount).toBe(1);
    });

    it('should track retries', () => {
      const executionId = collector.startExecution();
      const startTime = new Date();
      const endTime = new Date();

      collector.recordToolCall(
        executionId,
        'tool-1',
        'test_tool',
        { param: 'value' },
        startTime,
        endTime,
        true,
        false,
        undefined,
        2
      );

      const metrics = collector.getMetrics(executionId);

      expect(metrics?.retryCount).toBe(2);
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate summary statistics', () => {
      // Create some completed executions with non-zero duration
      const exec1 = collector.startExecution('exec-1');
      const startTime1 = new Date();
      const endTime1 = new Date(startTime1.getTime() + 100); // 100ms duration
      collector.recordStep(exec1, 1, startTime1, endTime1, [], 'stop');
      collector.endExecution(exec1, 'stop');

      const exec2 = collector.startExecution('exec-2');
      const startTime2 = new Date();
      const endTime2 = new Date(startTime2.getTime() + 200); // 200ms duration
      collector.recordStep(exec2, 1, startTime2, endTime2, [], 'stop');
      collector.endExecution(exec2, 'stop');

      const summary = collector.getSummary();

      expect(summary.totalExecutions).toBe(2);
      expect(summary.averageDuration).toBeGreaterThan(0);
      expect(summary.averageSteps).toBe(1);
      expect(summary.averageToolCalls).toBe(0);
    });

    it('should return zero values for empty history', () => {
      const summary = collector.getSummary();

      expect(summary.totalExecutions).toBe(0);
      expect(summary.averageDuration).toBe(0);
      expect(summary.averageSteps).toBe(0);
      expect(summary.averageToolCalls).toBe(0);
      expect(summary.totalTokens).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle recording metrics for non-existent execution', () => {
      // Should not throw
      collector.recordStep('non-existent', 1, new Date(), new Date(), [], 'stop');
      collector.recordTokenUsage('non-existent', 1, 100, 200);
      collector.recordToolCall(
        'non-existent',
        'tool-1',
        'test_tool',
        { param: 'value' },
        new Date(),
        new Date(),
        true,
        false,
        undefined,
        0
      );

      // Should not throw
      expect(() => collector.endExecution('non-existent')).not.toThrow();
    });
  });
});
