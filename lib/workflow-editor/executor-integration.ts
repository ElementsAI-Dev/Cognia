/**
 * Workflow Editor Executor Integration
 * Connects the visual workflow editor with the existing workflow executor
 */

import { visualToDefinition } from './converter';
import {
  executeWorkflow,
  createWorkflowExecution,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  getGlobalWorkflowRegistry,
  type WorkflowExecutorConfig,
  type WorkflowExecutorCallbacks,
  type WorkflowExecutorResult,
} from '@/lib/ai/workflows';
import type { VisualWorkflow } from '@/types/workflow/workflow-editor';
import type { WorkflowExecution, WorkflowDefinition } from '@/types/workflow';

// Store for active executions with automatic cleanup
const activeExecutions = new Map<string, WorkflowExecution>();

// Maximum number of executions to keep in memory
const MAX_ACTIVE_EXECUTIONS = 100;

// Cleanup interval in milliseconds (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Maximum age for completed executions in memory (30 minutes)
const MAX_EXECUTION_AGE = 30 * 60 * 1000;

/**
 * Clean up stale executions from memory
 */
function cleanupStaleExecutions(): void {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [id, execution] of activeExecutions) {
    // Remove completed/failed/cancelled executions older than MAX_EXECUTION_AGE
    if (
      execution.status === 'completed' ||
      execution.status === 'failed' ||
      execution.status === 'cancelled'
    ) {
      const completedAt = execution.completedAt?.getTime() || 0;
      if (now - completedAt > MAX_EXECUTION_AGE) {
        toDelete.push(id);
      }
    }
    // Remove idle executions that never started (orphaned)
    else if (execution.status === 'idle') {
      const startedAt = execution.startedAt?.getTime() || 0;
      if (now - startedAt > MAX_EXECUTION_AGE) {
        toDelete.push(id);
      }
    }
  }

  for (const id of toDelete) {
    activeExecutions.delete(id);
  }

  // If still over limit, remove oldest completed executions
  if (activeExecutions.size > MAX_ACTIVE_EXECUTIONS) {
    const sortedExecutions = Array.from(activeExecutions.entries())
      .filter(([_, e]) => e.status === 'completed' || e.status === 'failed' || e.status === 'cancelled')
      .sort((a, b) => (a[1].completedAt?.getTime() || 0) - (b[1].completedAt?.getTime() || 0));

    const toRemove = sortedExecutions.slice(0, activeExecutions.size - MAX_ACTIVE_EXECUTIONS);
    for (const [id] of toRemove) {
      activeExecutions.delete(id);
    }
  }
}

// Set up periodic cleanup (only in browser environment)
if (typeof window !== 'undefined') {
  setInterval(cleanupStaleExecutions, CLEANUP_INTERVAL);
}

/**
 * Remove an execution from the active executions map
 */
export function removeActiveExecution(executionId: string): void {
  activeExecutions.delete(executionId);
}

/**
 * Get all active executions (for debugging/monitoring)
 */
export function getActiveExecutions(): Map<string, WorkflowExecution> {
  return new Map(activeExecutions);
}

/**
 * Get the count of active executions
 */
export function getActiveExecutionCount(): number {
  return activeExecutions.size;
}

/**
 * Execute a visual workflow
 */
export async function executeVisualWorkflow(
  workflow: VisualWorkflow,
  input: Record<string, unknown>,
  config: WorkflowExecutorConfig,
  callbacks?: WorkflowExecutorCallbacks
): Promise<WorkflowExecutorResult> {
  // Run cleanup before starting new execution
  cleanupStaleExecutions();

  // Convert visual workflow to executable definition
  const definition = visualToDefinition(workflow);

  // Register the workflow
  const registry = getGlobalWorkflowRegistry();
  registry.register(definition);

  // Create a session ID for this execution
  const sessionId = `visual-${workflow.id}-${Date.now()}`;

  try {
    // Wrap callbacks to handle cleanup on completion
    const wrappedCallbacks: WorkflowExecutorCallbacks = {
      ...callbacks,
      onComplete: (execution) => {
        // Schedule cleanup after a short delay to allow for any final state reads
        setTimeout(() => removeActiveExecution(execution.id), MAX_EXECUTION_AGE);
        callbacks?.onComplete?.(execution);
      },
      onError: (execution, error) => {
        // Schedule cleanup after a short delay
        setTimeout(() => removeActiveExecution(execution.id), MAX_EXECUTION_AGE);
        callbacks?.onError?.(execution, error);
      },
    };

    // Execute the workflow using the correct signature
    const result = await executeWorkflow(
      definition.id,
      sessionId,
      input,
      config,
      wrappedCallbacks
    );

    // Store the execution for pause/resume/cancel
    activeExecutions.set(result.execution.id, result.execution);

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Create a workflow execution for a visual workflow
 */
export function createVisualWorkflowExecution(
  workflow: VisualWorkflow,
  input: Record<string, unknown> = {}
): WorkflowExecution {
  const definition = visualToDefinition(workflow);
  return createWorkflowExecution(definition, `visual-${workflow.id}`, input, {});
}

/**
 * Get the workflow definition from a visual workflow
 */
export function getWorkflowDefinition(workflow: VisualWorkflow): WorkflowDefinition {
  return visualToDefinition(workflow);
}

/**
 * Pause a running workflow execution
 */
export function pauseVisualWorkflow(executionId: string): void {
  const execution = activeExecutions.get(executionId);
  if (execution) {
    pauseWorkflow(execution);
  }
}

/**
 * Resume a paused workflow execution
 */
export function resumeVisualWorkflow(executionId: string): void {
  const execution = activeExecutions.get(executionId);
  if (execution) {
    resumeWorkflow(execution);
  }
}

/**
 * Cancel a running workflow execution
 */
export function cancelVisualWorkflow(executionId: string): void {
  const execution = activeExecutions.get(executionId);
  if (execution) {
    cancelWorkflow(execution);
  }
}

/**
 * Validate a visual workflow before execution
 */
export function validateVisualWorkflow(workflow: VisualWorkflow): {
  isValid: boolean;
  errors: Array<{ nodeId?: string; message: string; severity: 'error' | 'warning' }>;
} {
  const errors: Array<{ nodeId?: string; message: string; severity: 'error' | 'warning' }> = [];

  // Check for start node
  const startNodes = workflow.nodes.filter((n) => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push({ message: 'Workflow must have a start node', severity: 'error' });
  } else if (startNodes.length > 1) {
    errors.push({ message: 'Workflow can only have one start node', severity: 'error' });
  }

  // Check for end node
  const endNodes = workflow.nodes.filter((n) => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push({ message: 'Workflow must have an end node', severity: 'error' });
  } else if (endNodes.length > 1) {
    errors.push({ message: 'Workflow can only have one end node', severity: 'error' });
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  workflow.edges.forEach((edge) => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  workflow.nodes.forEach((node) => {
    if (!connectedNodes.has(node.id) && workflow.nodes.length > 1) {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" is not connected to the workflow`,
        severity: 'warning',
      });
    }
  });

  // Check for unconfigured nodes
  workflow.nodes.forEach((node) => {
    if (!node.data.isConfigured && node.type !== 'start' && node.type !== 'end') {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" is not fully configured`,
        severity: 'warning',
      });
    }
  });

  // Check for cycles (simple check)
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = workflow.edges.filter((e) => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.target)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  if (startNodes.length > 0 && hasCycle(startNodes[0].id)) {
    errors.push({ message: 'Workflow contains a cycle', severity: 'error' });
  }

  return {
    isValid: !errors.some((e) => e.severity === 'error'),
    errors,
  };
}

// Named exports for all functions
export const executorIntegration = {
  executeVisualWorkflow,
  createVisualWorkflowExecution,
  getWorkflowDefinition,
  pauseVisualWorkflow,
  resumeVisualWorkflow,
  cancelVisualWorkflow,
  validateVisualWorkflow,
};
