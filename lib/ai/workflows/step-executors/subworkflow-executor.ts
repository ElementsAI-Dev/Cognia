/**
 * Subworkflow Step Executor
 * Executes nested workflows
 */

import type { WorkflowStepDefinition, StepExecutorConfig, StepExecutorCallbacks } from './types';

// Forward declaration - actual function imported from executor to avoid circular deps
type ExecuteWorkflowFn = (
  workflowId: string,
  sessionId: string,
  input: Record<string, unknown>,
  config: StepExecutorConfig,
  callbacks: StepExecutorCallbacks
) => Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }>;

let executeWorkflowFn: ExecuteWorkflowFn | null = null;

export function setExecuteWorkflowFn(fn: ExecuteWorkflowFn): void {
  executeWorkflowFn = fn;
}

export async function executeSubworkflowStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  config: StepExecutorConfig,
  callbacks: StepExecutorCallbacks
): Promise<unknown> {
  if (!step.workflowId) {
    throw new Error('Subworkflow step requires workflowId');
  }

  if (!executeWorkflowFn) {
    throw new Error('executeWorkflow function not initialized');
  }

  // Map inputs according to inputMapping
  const subworkflowInput: Record<string, unknown> = {};
  if (step.inputMapping) {
    for (const [targetKey, sourceKey] of Object.entries(step.inputMapping)) {
      subworkflowInput[targetKey] = input[sourceKey];
    }
  } else {
    Object.assign(subworkflowInput, input);
  }

  // Execute the subworkflow
  const result = await executeWorkflowFn(
    step.workflowId,
    `sub-${Date.now()}`,
    subworkflowInput,
    config,
    callbacks
  );

  if (!result.success) {
    throw new Error(`Subworkflow failed: ${result.error}`);
  }

  // Map outputs according to outputMapping
  const output: Record<string, unknown> = {};
  if (step.outputMapping && result.output) {
    for (const [targetKey, sourceKey] of Object.entries(step.outputMapping)) {
      output[targetKey] = result.output[sourceKey];
    }
  } else {
    Object.assign(output, result.output);
  }

  return output;
}
