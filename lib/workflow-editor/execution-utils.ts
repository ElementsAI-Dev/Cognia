/**
 * Workflow Execution Utilities
 * Helper functions for workflow execution management
 */

import type {
  VisualWorkflow,
  WorkflowExecutionState,
  ExecutionLog,
  NodeExecutionState,
} from '@/types/workflow/workflow-editor';

/**
 * Format execution duration as human-readable string
 */
export function formatExecutionDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  // Always show seconds when duration > 1 hour
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

/**
 * Get execution summary
 */
export function getExecutionSummary(state: WorkflowExecutionState): {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  runningNodes: number;
  pendingNodes: number;
  successRate: number;
} {
  const nodeStates = Object.values(state.nodeStates);
  const totalNodes = nodeStates.length;
  const completedNodes = nodeStates.filter((n) => n.status === 'completed').length;
  const failedNodes = nodeStates.filter((n) => n.status === 'failed').length;
  const runningNodes = nodeStates.filter((n) => n.status === 'running').length;
  const pendingNodes = nodeStates.filter((n) => n.status === 'pending').length;

  const successRate = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

  return {
    totalNodes,
    completedNodes,
    failedNodes,
    runningNodes,
    pendingNodes,
    successRate,
  };
}

/**
 * Filter logs by level
 */
export function filterLogsByLevel(
  logs: ExecutionLog[],
  level: ExecutionLog['level']
): ExecutionLog[] {
  return logs.filter((log) => log.level === level);
}

/**
 * Get logs for a specific node
 */
export function getLogsForNode(
  state: WorkflowExecutionState,
  nodeId: string
): ExecutionLog[] {
  return state.logs.filter((log) =>
    log.message.includes(nodeId) || (log as { stepId?: string }).stepId === nodeId
  );
}

/**
 * Get failed nodes from execution state
 */
export function getFailedNodes(state: WorkflowExecutionState): Array<{
  nodeId: string;
  error: string;
}> {
  return Object.entries(state.nodeStates)
    .filter(([_, nodeState]) => nodeState.status === 'failed')
    .map(([nodeId, nodeState]) => ({
      nodeId,
      error: nodeState.error || 'Unknown error',
    }));
}

/**
 * Get execution timeline
 */
export function getExecutionTimeline(state: WorkflowExecutionState): Array<{
  nodeId: string;
  status: string;
  timestamp: Date;
  duration?: number;
}> {
  const timeline: Array<{
    nodeId: string;
    status: string;
    timestamp: Date;
    duration?: number;
  }> = [];

  Object.entries(state.nodeStates).forEach(([nodeId, nodeState]) => {
    if (nodeState.startedAt) {
      timeline.push({
        nodeId,
        status: 'started',
        timestamp: nodeState.startedAt,
      });
    }

    if (nodeState.completedAt) {
      const duration = nodeState.startedAt
        ? nodeState.completedAt.getTime() - nodeState.startedAt.getTime()
        : undefined;

      timeline.push({
        nodeId,
        status: nodeState.status,
        timestamp: nodeState.completedAt,
        duration,
      });
    }
  });

  // Sort by timestamp
  return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Estimate remaining execution time
 */
export function estimateRemainingTime(
  state: WorkflowExecutionState
): number | null {
  // Don't estimate if execution is completed, failed, or cancelled
  if (state.status !== 'running') {
    return null;
  }

  const summary = getExecutionSummary(state);

  if (summary.totalNodes === 0 || summary.runningNodes === 0) {
    return null;
  }

  // Calculate average time per completed node
  const completedNodes = Object.entries(state.nodeStates).filter(
    ([_, n]) => n.status === 'completed' && n.startedAt && n.completedAt
  );

  if (completedNodes.length === 0) {
    return null;
  }

  const totalTime = completedNodes.reduce((sum, [_, node]) => {
    if (node.startedAt && node.completedAt) {
      return sum + (node.completedAt.getTime() - node.startedAt.getTime());
    }
    return sum;
  }, 0);

  const avgTimePerNode = totalTime / completedNodes.length;
  const remainingNodes = summary.pendingNodes + summary.runningNodes;

  return Math.round(avgTimePerNode * remainingNodes);
}

/**
 * Export execution state as JSON
 */
export function exportExecutionState(state: WorkflowExecutionState): string {
  return JSON.stringify(
    {
      executionId: state.executionId,
      workflowId: state.workflowId,
      status: state.status,
      progress: state.progress,
      startedAt: state.startedAt?.toISOString(),
      completedAt: state.completedAt?.toISOString(),
      input: state.input,
      output: state.output,
      error: state.error,
      nodeStates: state.nodeStates,
      logs: state.logs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      summary: getExecutionSummary(state),
    },
    null,
    2
  );
}

/**
 * Format execution status for display
 */
export function formatExecutionStatus(status: WorkflowExecutionState['status']): string {
  const statusMap: Record<WorkflowExecutionState['status'], string> = {
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  return statusMap[status] || status;
}

/**
 * Get status color for UI
 */
export function getStatusColor(
  status: WorkflowExecutionState['status']
): string {
  const colorMap: Record<WorkflowExecutionState['status'], string> = {
    idle: 'gray',
    running: 'blue',
    paused: 'yellow',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray',
  };

  return colorMap[status] || 'gray';
}

/**
 * Get node status color for UI
 */
export function getNodeStatusColor(status: NodeExecutionState['status']): string {
  const colorMap: Record<NodeExecutionState['status'], string> = {
    idle: 'gray',
    waiting: 'gray',
    pending: 'gray',
    running: 'blue',
    completed: 'green',
    failed: 'red',
    skipped: 'yellow',
  };

  return colorMap[status] || 'gray';
}

/**
 * Check if execution can be retried
 */
export function canRetryExecution(state: WorkflowExecutionState): boolean {
  return (
    state.status === 'failed' &&
    Object.values(state.nodeStates).some(
      (node) => node.status === 'failed' && (node.retryCount || 0) < 3
    )
  );
}

/**
 * Get retryable nodes
 */
export function getRetryableNodes(
  state: WorkflowExecutionState
): string[] {
  return Object.entries(state.nodeStates)
    .filter(([_, node]) => node.status === 'failed' && (node.retryCount || 0) < 3)
    .map(([nodeId]) => nodeId);
}

/**
 * Calculate execution statistics
 */
export function calculateExecutionStats(state: WorkflowExecutionState): {
  duration: number;
  averageStepDuration: number;
  fastestStep: { nodeId: string; duration: number } | null;
  slowestStep: { nodeId: string; duration: number } | null;
  totalErrors: number;
  totalWarnings: number;
} {
  const startTime = state.startedAt?.getTime() ?? Date.now();
  const duration = state.completedAt
    ? state.completedAt.getTime() - startTime
    : Date.now() - startTime;

  // Calculate step durations
  const stepDurations: Array<{ nodeId: string; duration: number }> = [];
  Object.entries(state.nodeStates).forEach(([nodeId, nodeState]) => {
    if (nodeState.startedAt && nodeState.completedAt) {
      stepDurations.push({
        nodeId,
        duration: nodeState.completedAt.getTime() - nodeState.startedAt.getTime(),
      });
    }
  });

  const averageStepDuration =
    stepDurations.length > 0
      ? stepDurations.reduce((sum, s) => sum + s.duration, 0) / stepDurations.length
      : 0;

  const fastestStep =
    stepDurations.length > 0
      ? stepDurations.reduce((min, s) => (s.duration < min.duration ? s : min))
      : null;

  const slowestStep =
    stepDurations.length > 0
      ? stepDurations.reduce((max, s) => (s.duration > max.duration ? s : max))
      : null;

  // Count errors and warnings from logs
  const totalErrors = state.logs.filter((log) => log.level === 'error').length;
  const totalWarnings = state.logs.filter((log) => log.level === 'warn').length;

  return {
    duration,
    averageStepDuration,
    fastestStep,
    slowestStep,
    totalErrors,
    totalWarnings,
  };
}

/**
 * Validate workflow input before execution
 */
export function validateWorkflowInput(
  workflow: VisualWorkflow,
  input: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if workflow has input schema defined
  const settings = workflow.settings as { inputSchema?: { required?: string[]; properties?: Record<string, unknown> } };
  if (settings.inputSchema) {
    const schema = settings.inputSchema;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Type validation (basic)
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([fieldName, fieldType]) => {
        if (fieldName in input) {
          const value = input[fieldName];
          const expectedType = fieldType as string;

          if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Field "${fieldName}" must be a string`);
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Field "${fieldName}" must be a number`);
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Field "${fieldName}" must be a boolean`);
          } else if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Field "${fieldName}" must be an array`);
          } else if (expectedType === 'object' && typeof value !== 'object') {
            errors.push(`Field "${fieldName}" must be an object`);
          }
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize workflow output for display/storage
 */
export function sanitizeWorkflowOutput(
  output: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(output).forEach(([key, value]) => {
    // Remove sensitive data (API keys, passwords, etc.)
    if (
      key.toLowerCase().includes('apikey') ||
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('token')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeWorkflowOutput(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Sanitize arrays
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeWorkflowOutput(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}
