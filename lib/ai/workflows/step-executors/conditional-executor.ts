/**
 * Conditional Step Executor
 * Evaluates conditions and branches workflow execution
 */

import type { WorkflowStepDefinition, WorkflowExecution } from './types';
import { evaluateRestrictedBooleanExpression } from './expression-evaluator';

export async function executeConditionalStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  _execution: WorkflowExecution
): Promise<unknown> {
  if (!step.condition) {
    return input;
  }

  try {
    const result = evaluateRestrictedBooleanExpression(step.condition, input);
    return { conditionResult: result, ...input };
  } catch (_error) {
    throw new Error(`Failed to evaluate condition: ${step.condition}`);
  }
}
