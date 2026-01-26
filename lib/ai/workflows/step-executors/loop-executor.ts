/**
 * Loop Step Executor
 * Executes loops (forEach, times, while) in workflow steps
 */

import type {
  WorkflowStepDefinition,
  WorkflowExecution,
  StepExecutorConfig,
  StepExecutorCallbacks,
} from './types';

export async function executeLoopStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  _execution: WorkflowExecution,
  _config: StepExecutorConfig,
  _callbacks: StepExecutorCallbacks
): Promise<unknown> {
  const maxIterations = step.maxIterations || 100;
  const results: unknown[] = [];
  
  switch (step.loopType) {
    case 'forEach': {
      const collection = step.collection ? input[step.collection] : input.collection;
      if (!Array.isArray(collection)) {
        throw new Error('forEach loop requires array collection');
      }
      for (let i = 0; i < Math.min(collection.length, maxIterations); i++) {
        results.push({ [step.iteratorVariable || 'item']: collection[i], index: i });
      }
      break;
    }
    case 'times': {
      for (let i = 0; i < maxIterations; i++) {
        results.push({ [step.iteratorVariable || 'index']: i });
      }
      break;
    }
    case 'while': {
      if (!step.condition) {
        throw new Error('while loop requires condition');
      }
      let iteration = 0;
      let conditionResult = true;
      while (conditionResult && iteration < maxIterations) {
        try {
          const conditionFn = new Function('iteration', 'input', `return ${step.condition}`);
          conditionResult = conditionFn(iteration, input);
          if (conditionResult) {
            results.push({ [step.iteratorVariable || 'iteration']: iteration });
            iteration++;
          }
        } catch {
          break;
        }
      }
      break;
    }
  }

  return { iterations: results, count: results.length };
}
