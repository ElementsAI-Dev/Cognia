/**
 * Tool Step Executor
 * Executes tool-based workflow steps
 */

import { getGlobalToolRegistry } from '@/lib/ai/tools/registry';
import type { WorkflowStepDefinition } from './types';

export async function executeToolStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.toolName) {
    throw new Error('Tool step requires toolName');
  }

  const registry = getGlobalToolRegistry();
  const toolDef = registry.get(step.toolName);

  if (!toolDef) {
    throw new Error(`Tool not found: ${step.toolName}`);
  }

  const toolFn = toolDef.create({});
  return toolFn(input);
}
