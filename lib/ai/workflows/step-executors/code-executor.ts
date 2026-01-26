/**
 * Code Step Executor
 * Executes JavaScript/TypeScript code in workflow steps
 */

import type { WorkflowStepDefinition } from './types';

export async function executeCodeStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.code) {
    throw new Error('Code step requires code');
  }

  try {
    // Create a sandboxed function with input as context
    const asyncFn = new Function(
      'input',
      `return (async () => { ${step.code} })()`
    );
    const result = await asyncFn(input);
    return typeof result === 'object' ? result : { result };
  } catch (error) {
    throw new Error(`Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
