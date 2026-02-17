/**
 * Tests for workflow execution utilities
 */

// Jest globals are available globally in test environment
import {
  formatExecutionDuration,
  getExecutionSummary,
  filterLogsByLevel,
  getFailedNodes,
  estimateRemainingTime,
  formatExecutionStatus,
  getStatusColor,
  getNodeStatusColor,
  canRetryExecution,
  getRetryableNodes,
  calculateExecutionStats,
  validateWorkflowInput,
  sanitizeWorkflowOutput,
} from './execution-utils';
import type { WorkflowExecutionState, VisualWorkflow } from '@/types/workflow/workflow-editor';

describe('Workflow Execution Utilities', () => {
  const mockExecutionState: WorkflowExecutionState = {
    executionId: 'exec-123',
    workflowId: 'workflow-456',
    runtime: 'browser',
    status: 'running',
    progress: 50,
    nodeStates: {
      node1: {
        nodeId: 'node1',
        status: 'completed',
        startedAt: new Date('2025-01-01T10:00:00Z'),
        completedAt: new Date('2025-01-01T10:00:05Z'),
        retryCount: 0,
        logs: [],
      },
      node2: {
        nodeId: 'node2',
        status: 'running',
        startedAt: new Date('2025-01-01T10:00:05Z'),
        retryCount: 0,
        logs: [],
      },
      node3: {
        nodeId: 'node3',
        status: 'failed',
        startedAt: new Date('2025-01-01T10:00:10Z'),
        completedAt: new Date('2025-01-01T10:00:12Z'),
        error: 'Task failed',
        retryCount: 1,
        logs: [],
      },
      node4: {
        nodeId: 'node4',
        status: 'pending',
        retryCount: 0,
        logs: [],
      },
    },
    startedAt: new Date('2025-01-01T10:00:00Z'),
    input: { text: 'test' },
    logs: [
      {
        timestamp: new Date('2025-01-01T10:00:01Z'),
        level: 'info',
        message: 'Starting...',
      },
      {
        timestamp: new Date('2025-01-01T10:00:02Z'),
        level: 'error',
        message: 'Error occurred',
      },
    ],
  };

  describe('formatExecutionDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatExecutionDuration(500)).toBe('500ms');
      expect(formatExecutionDuration(1500)).toBe('1s');
      expect(formatExecutionDuration(90000)).toBe('1m 30s');
      expect(formatExecutionDuration(3665000)).toBe('1h 1m 5s');
    });
  });

  describe('getExecutionSummary', () => {
    it('should calculate execution summary correctly', () => {
      const summary = getExecutionSummary(mockExecutionState);

      expect(summary.totalNodes).toBe(4);
      expect(summary.completedNodes).toBe(1);
      expect(summary.failedNodes).toBe(1);
      expect(summary.runningNodes).toBe(1);
      expect(summary.pendingNodes).toBe(1);
      expect(summary.successRate).toBe(25);
    });

    it('should handle empty state', () => {
      const emptyState: WorkflowExecutionState = {
        ...mockExecutionState,
        nodeStates: {},
      };
      const summary = getExecutionSummary(emptyState);

      expect(summary.totalNodes).toBe(0);
      expect(summary.successRate).toBe(0);
    });
  });

  describe('filterLogsByLevel', () => {
    it('should filter logs by level', () => {
      const infoLogs = filterLogsByLevel(mockExecutionState.logs, 'info');
      const errorLogs = filterLogsByLevel(mockExecutionState.logs, 'error');

      expect(infoLogs).toHaveLength(1);
      expect(errorLogs).toHaveLength(1);
      expect(infoLogs[0].message).toBe('Starting...');
      expect(errorLogs[0].message).toBe('Error occurred');
    });
  });

  describe('getFailedNodes', () => {
    it('should return failed nodes with errors', () => {
      const failedNodes = getFailedNodes(mockExecutionState);

      expect(failedNodes).toHaveLength(1);
      expect(failedNodes[0]).toEqual({
        nodeId: 'node3',
        error: 'Task failed',
      });
    });

    it('should return empty array when no failures', () => {
      const noFailures: WorkflowExecutionState = {
        ...mockExecutionState,
        nodeStates: {
          node1: {
            nodeId: 'node1',
            status: 'completed',
            retryCount: 0,
            logs: [],
          },
        },
      };

      const failedNodes = getFailedNodes(noFailures);
      expect(failedNodes).toHaveLength(0);
    });
  });

  describe('estimateRemainingTime', () => {
    it('should estimate remaining time for running execution', () => {
      const estimate = estimateRemainingTime(mockExecutionState);

      expect(estimate).not.toBeNull();
      expect(typeof estimate).toBe('number');
      expect(estimate!).toBeGreaterThan(0);
    });

    it('should return null for completed execution', () => {
      const completed: WorkflowExecutionState = {
        ...mockExecutionState,
        status: 'completed',
      };

      const estimate = estimateRemainingTime(completed);
      expect(estimate).toBeNull();
    });

    it('should return null when no completed nodes', () => {
      const noCompleted: WorkflowExecutionState = {
        ...mockExecutionState,
        nodeStates: {
          node1: {
            nodeId: 'node1',
            status: 'running',
            startedAt: new Date(),
            retryCount: 0,
            logs: [],
          },
        },
      };

      const estimate = estimateRemainingTime(noCompleted);
      expect(estimate).toBeNull();
    });
  });

  describe('formatExecutionStatus', () => {
    it('should format execution status', () => {
      expect(formatExecutionStatus('running')).toBe('Running');
      expect(formatExecutionStatus('paused')).toBe('Paused');
      expect(formatExecutionStatus('completed')).toBe('Completed');
      expect(formatExecutionStatus('failed')).toBe('Failed');
      expect(formatExecutionStatus('cancelled')).toBe('Cancelled');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct status colors', () => {
      expect(getStatusColor('running')).toBe('blue');
      expect(getStatusColor('paused')).toBe('yellow');
      expect(getStatusColor('completed')).toBe('green');
      expect(getStatusColor('failed')).toBe('red');
      expect(getStatusColor('cancelled')).toBe('gray');
    });
  });

  describe('getNodeStatusColor', () => {
    it('should return correct node status colors', () => {
      expect(getNodeStatusColor('pending')).toBe('gray');
      expect(getNodeStatusColor('running')).toBe('blue');
      expect(getNodeStatusColor('completed')).toBe('green');
      expect(getNodeStatusColor('failed')).toBe('red');
      expect(getNodeStatusColor('skipped')).toBe('yellow');
    });
  });

  describe('canRetryExecution', () => {
    it('should return true for failed execution with retryable nodes', () => {
      const failedState: WorkflowExecutionState = {
        ...mockExecutionState,
        status: 'failed',
      };

      expect(canRetryExecution(failedState)).toBe(true);
    });

    it('should return false when all retries exhausted', () => {
      const allRetriesExhausted: WorkflowExecutionState = {
        ...mockExecutionState,
        status: 'failed',
        nodeStates: {
          node1: {
            nodeId: 'node1',
            status: 'failed',
            retryCount: 3,
            logs: [],
          },
        },
      };

      expect(canRetryExecution(allRetriesExhausted)).toBe(false);
    });

    it('should return false for non-failed execution', () => {
      expect(canRetryExecution(mockExecutionState)).toBe(false);
    });
  });

  describe('getRetryableNodes', () => {
    it('should return nodes with less than 3 retries', () => {
      const retryable = getRetryableNodes(mockExecutionState);

      expect(retryable).toContain('node3');
    });

    it('should return empty array when no retryable nodes', () => {
      const noRetryable: WorkflowExecutionState = {
        ...mockExecutionState,
        nodeStates: {
          node1: {
            nodeId: 'node1',
            status: 'failed',
            retryCount: 5,
            logs: [],
          },
        },
      };

      const retryable = getRetryableNodes(noRetryable);
      expect(retryable).toHaveLength(0);
    });
  });

  describe('calculateExecutionStats', () => {
    it('should calculate execution statistics', () => {
      const stats = calculateExecutionStats(mockExecutionState);

      expect(stats.duration).toBeGreaterThan(0);
      expect(stats.averageStepDuration).toBeGreaterThan(0);
      expect(stats.fastestStep).not.toBeNull();
      expect(stats.slowestStep).not.toBeNull();
      expect(stats.totalErrors).toBe(1);
      expect(stats.totalWarnings).toBe(0);
    });

    it('should handle execution with no completed steps', () => {
      const noCompletedSteps: WorkflowExecutionState = {
        ...mockExecutionState,
        nodeStates: {
          node1: {
            nodeId: 'node1',
            status: 'running',
            startedAt: new Date(),
            retryCount: 0,
            logs: [],
          },
        },
      };

      const stats = calculateExecutionStats(noCompletedSteps);
      expect(stats.averageStepDuration).toBe(0);
    });
  });

  describe('validateWorkflowInput', () => {
    it('should validate input against schema', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [],
        edges: [],
        settings: {
          inputSchema: {
            required: ['name', 'email'],
            properties: {
              name: 'string',
              email: 'string',
              age: 'number',
            },
          },
        },
      } as unknown as VisualWorkflow;

      // Valid input
      const validResult = validateWorkflowInput(workflow, {
        name: 'John',
        email: 'john@example.com',
        age: 30,
      });
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Missing required field
      const missingFieldResult = validateWorkflowInput(workflow, {
        name: 'John',
      });
      expect(missingFieldResult.valid).toBe(false);
      expect(missingFieldResult.errors).toContain('Missing required field: email');

      // Wrong type
      const wrongTypeResult = validateWorkflowInput(workflow, {
        name: 'John',
        email: 'john@example.com',
        age: '30', // Should be number
      });
      expect(wrongTypeResult.valid).toBe(false);
      expect(wrongTypeResult.errors).toContain('Field "age" must be a number');
    });

    it('should pass validation when no schema defined', () => {
      const workflow = {
        id: 'test',
        name: 'Test',
        nodes: [],
        edges: [],
        settings: {},
      } as unknown as VisualWorkflow;

      const result = validateWorkflowInput(workflow, {});
      expect(result.valid).toBe(true);
    });
  });

  describe('sanitizeWorkflowOutput', () => {
    it('should redact sensitive fields', () => {
      const output = {
        username: 'john',
        apiKey: 'secret-key-123',
        password: 'password123',
        data: 'normal data',
        nested: {
          token: 'secret-token',
          value: 'normal',
        },
      };

      const sanitized = sanitizeWorkflowOutput(output);

      expect(sanitized.username).toBe('john');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.data).toBe('normal data');
      expect((sanitized.nested as Record<string, unknown>).token).toBe('[REDACTED]');
      expect((sanitized.nested as Record<string, unknown>).value).toBe('normal');
    });

    it('should handle arrays', () => {
      const output = {
        items: [
          { name: 'item1', apiKey: 'key1' },
          { name: 'item2', apiKey: 'key2' },
        ],
      };

      const sanitized = sanitizeWorkflowOutput(output);

      const items = sanitized.items as Record<string, unknown>[];
      expect(items[0].apiKey).toBe('[REDACTED]');
      expect(items[1].apiKey).toBe('[REDACTED]');
      expect(items[0].name).toBe('item1');
    });
  });
});
