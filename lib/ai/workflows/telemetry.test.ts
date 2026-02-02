/**
 * Workflow Telemetry Tests
 * Tests metrics collection, aggregation, and analysis
 */

import {
  telemetryCollector,
  estimateObjectSize,
  withTelemetry,
} from './telemetry';

jest.mock('@/lib/logger', () => ({
  loggers: {
    ai: {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

describe('telemetryCollector', () => {
  beforeEach(() => {
    telemetryCollector.clear();
  });

  describe('startExecution', () => {
    it('should start tracking a new execution', () => {
      telemetryCollector.startExecution('workflow-1', 'Test Workflow', 'exec-1', 5);

      const execution = telemetryCollector.getExecution('exec-1');

      expect(execution).toBeDefined();
      expect(execution?.workflowId).toBe('workflow-1');
      expect(execution?.workflowName).toBe('Test Workflow');
      expect(execution?.executionId).toBe('exec-1');
      expect(execution?.totalSteps).toBe(5);
      expect(execution?.status).toBe('running');
    });

    it('should set initial counters to zero', () => {
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 3);

      const execution = telemetryCollector.getExecution('exec-1');

      expect(execution?.completedSteps).toBe(0);
      expect(execution?.failedSteps).toBe(0);
      expect(execution?.skippedSteps).toBe(0);
      expect(execution?.totalTokensUsed).toBe(0);
    });
  });

  describe('startStep and completeStep', () => {
    beforeEach(() => {
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 2);
    });

    it('should record step start', () => {
      telemetryCollector.startStep('exec-1', 'step-1', 'AI Step', 'ai', 100);

      const execution = telemetryCollector.getExecution('exec-1');
      const step = execution?.steps.find((s) => s.stepId === 'step-1');

      expect(step).toBeDefined();
      expect(step?.stepName).toBe('AI Step');
      expect(step?.stepType).toBe('ai');
      expect(step?.inputSize).toBe(100);
      expect(step?.status).toBe('running');
    });

    it('should record step completion with success', () => {
      telemetryCollector.startStep('exec-1', 'step-1', 'AI Step', 'ai', 100);
      telemetryCollector.completeStep('exec-1', 'step-1', {
        success: true,
        outputSize: 200,
        tokensUsed: 500,
      });

      const execution = telemetryCollector.getExecution('exec-1');
      const step = execution?.steps.find((s) => s.stepId === 'step-1');

      expect(step?.status).toBe('success');
      expect(step?.outputSize).toBe(200);
      expect(step?.tokensUsed).toBe(500);
      expect(step?.duration).toBeDefined();
      expect(execution?.completedSteps).toBe(1);
      expect(execution?.totalTokensUsed).toBe(500);
    });

    it('should record step failure', () => {
      telemetryCollector.startStep('exec-1', 'step-1', 'Failing Step', 'ai', 50);
      telemetryCollector.completeStep('exec-1', 'step-1', {
        success: false,
        error: 'API error',
      });

      const execution = telemetryCollector.getExecution('exec-1');
      const step = execution?.steps.find((s) => s.stepId === 'step-1');

      expect(step?.status).toBe('failed');
      expect(step?.error).toBe('API error');
      expect(execution?.failedSteps).toBe(1);
    });

    it('should record retry count', () => {
      telemetryCollector.startStep('exec-1', 'step-1', 'Retry Step', 'webhook', 30);
      telemetryCollector.completeStep('exec-1', 'step-1', {
        success: true,
        retryCount: 2,
      });

      const execution = telemetryCollector.getExecution('exec-1');
      const step = execution?.steps.find((s) => s.stepId === 'step-1');

      expect(step?.retryCount).toBe(2);
    });
  });

  describe('skipStep', () => {
    it('should record skipped step', () => {
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 2);
      telemetryCollector.skipStep('exec-1', 'step-1', 'Skipped Step', 'transform');

      const execution = telemetryCollector.getExecution('exec-1');
      const step = execution?.steps.find((s) => s.stepId === 'step-1');

      expect(step?.status).toBe('skipped');
      expect(step?.duration).toBe(0);
      expect(execution?.skippedSteps).toBe(1);
    });
  });

  describe('completeExecution', () => {
    it('should complete execution with success', () => {
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 1);
      telemetryCollector.startStep('exec-1', 'step-1', 'Step', 'ai', 10);
      telemetryCollector.completeStep('exec-1', 'step-1', { success: true });

      const result = telemetryCollector.completeExecution('exec-1', { success: true });

      expect(result?.status).toBe('success');
      expect(result?.endTime).toBeDefined();
      expect(result?.totalDuration).toBeDefined();
    });

    it('should complete execution with failure', () => {
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 1);

      const result = telemetryCollector.completeExecution('exec-1', {
        success: false,
        error: 'Workflow failed',
      });

      expect(result?.status).toBe('failed');
      expect(result?.error).toBe('Workflow failed');
    });
  });

  describe('cancelExecution', () => {
    it('should mark execution as cancelled', () => {
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 2);
      telemetryCollector.cancelExecution('exec-1');

      const execution = telemetryCollector.getExecution('exec-1');

      expect(execution?.status).toBe('cancelled');
      expect(execution?.endTime).toBeDefined();
    });
  });

  describe('getWorkflowExecutions', () => {
    it('should return all executions for a workflow', () => {
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 1);
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-2', 1);
      telemetryCollector.startExecution('workflow-2', 'Other', 'exec-3', 1);

      const executions = telemetryCollector.getWorkflowExecutions('workflow-1');

      expect(executions).toHaveLength(2);
      expect(executions.every((e) => e.workflowId === 'workflow-1')).toBe(true);
    });
  });

  describe('getWorkflowMetrics', () => {
    beforeEach(() => {
      // Create some executions with varying results
      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 2);
      telemetryCollector.startStep('exec-1', 'step-1', 'S1', 'ai', 10);
      telemetryCollector.completeStep('exec-1', 'step-1', { success: true, tokensUsed: 100 });
      telemetryCollector.completeExecution('exec-1', { success: true });

      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-2', 2);
      telemetryCollector.startStep('exec-2', 'step-1', 'S1', 'ai', 10);
      telemetryCollector.completeStep('exec-2', 'step-1', { success: false });
      telemetryCollector.completeExecution('exec-2', { success: false });
    });

    it('should return null for unknown workflow', () => {
      const metrics = telemetryCollector.getWorkflowMetrics('unknown');
      expect(metrics).toBeNull();
    });

    it('should calculate execution counts', () => {
      const metrics = telemetryCollector.getWorkflowMetrics('workflow-1');

      expect(metrics?.totalExecutions).toBe(2);
      expect(metrics?.successCount).toBe(1);
      expect(metrics?.failureCount).toBe(1);
    });

    it('should calculate token usage', () => {
      const metrics = telemetryCollector.getWorkflowMetrics('workflow-1');

      expect(metrics?.totalTokensUsed).toBe(100);
    });

    it('should calculate step metrics', () => {
      const metrics = telemetryCollector.getWorkflowMetrics('workflow-1');

      expect(metrics?.stepMetrics['step-1']).toBeDefined();
      expect(metrics?.stepMetrics['step-1'].totalExecutions).toBe(2);
      expect(metrics?.stepMetrics['step-1'].successCount).toBe(1);
      expect(metrics?.stepMetrics['step-1'].failureCount).toBe(1);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on execution completion', () => {
      const listener = jest.fn();
      const unsubscribe = telemetryCollector.subscribe(listener);

      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 1);
      telemetryCollector.completeExecution('exec-1', { success: true });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-1',
          status: 'success',
        })
      );

      unsubscribe();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = telemetryCollector.subscribe(listener);
      unsubscribe();

      telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 1);
      telemetryCollector.completeExecution('exec-1', { success: true });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('exportAll and clear', () => {
    it('should export all telemetry data', () => {
      telemetryCollector.startExecution('w1', 'Test 1', 'e1', 1);
      telemetryCollector.startExecution('w2', 'Test 2', 'e2', 1);

      const exported = telemetryCollector.exportAll();

      expect(exported).toHaveLength(2);
    });

    it('should clear all data', () => {
      telemetryCollector.startExecution('w1', 'Test', 'e1', 1);
      telemetryCollector.clear();

      const exported = telemetryCollector.exportAll();

      expect(exported).toHaveLength(0);
    });
  });
});

describe('estimateObjectSize', () => {
  it('should estimate size of simple object', () => {
    const obj = { a: 1, b: 'test' };
    const size = estimateObjectSize(obj);

    expect(size).toBeGreaterThan(0);
  });

  it('should return 0 for circular references', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;

    const size = estimateObjectSize(obj);

    expect(size).toBe(0);
  });
});

describe('withTelemetry', () => {
  beforeEach(() => {
    telemetryCollector.clear();
    telemetryCollector.startExecution('workflow-1', 'Test', 'exec-1', 1);
  });

  it('should wrap successful execution with telemetry', async () => {
    const executor = jest.fn().mockResolvedValue({ result: 'success' });

    const result = await withTelemetry(
      'exec-1',
      'step-1',
      'Test Step',
      'transform',
      { input: 'data' },
      executor
    );

    expect(result).toEqual({ result: 'success' });

    const execution = telemetryCollector.getExecution('exec-1');
    const step = execution?.steps.find((s) => s.stepId === 'step-1');

    expect(step?.status).toBe('success');
  });

  it('should wrap failed execution with telemetry', async () => {
    const executor = jest.fn().mockRejectedValue(new Error('Failed'));

    await expect(
      withTelemetry('exec-1', 'step-1', 'Failing Step', 'ai', {}, executor)
    ).rejects.toThrow('Failed');

    const execution = telemetryCollector.getExecution('exec-1');
    const step = execution?.steps.find((s) => s.stepId === 'step-1');

    expect(step?.status).toBe('failed');
    expect(step?.error).toBe('Failed');
  });
});
