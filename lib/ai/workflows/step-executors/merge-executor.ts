/**
 * Merge Step Executor
 * Combines multiple inputs using various strategies
 */

import type { WorkflowStepDefinition } from './types';

export async function executeMergeStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  const inputs = Object.values(input);
  
  switch (step.mergeStrategy) {
    case 'concat': {
      // Concatenate arrays
      const arrays = inputs.filter(Array.isArray);
      return { result: arrays.flat() };
    }
    case 'merge': {
      // Deep merge objects
      return { result: Object.assign({}, ...inputs.filter(v => typeof v === 'object' && v !== null)) };
    }
    case 'first': {
      return { result: inputs[0] };
    }
    case 'last': {
      return { result: inputs[inputs.length - 1] };
    }
    case 'custom':
    default: {
      // Return all inputs as-is
      return { result: input };
    }
  }
}
