/**
 * Transform Step Executor
 * Transforms data using expressions (map, filter, reduce, sort, custom)
 */

import type { WorkflowStepDefinition } from './types';

export async function executeTransformStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.expression) {
    return input;
  }

  try {
    const data = input.data || input;
    
    switch (step.transformType) {
      case 'map': {
        if (!Array.isArray(data)) {
          throw new Error('Map transform requires array input');
        }
        const mapFn = new Function('item', 'index', `return ${step.expression}`);
        return { result: data.map((item, index) => mapFn(item, index)) };
      }
      case 'filter': {
        if (!Array.isArray(data)) {
          throw new Error('Filter transform requires array input');
        }
        const filterFn = new Function('item', 'index', `return ${step.expression}`);
        return { result: data.filter((item, index) => filterFn(item, index)) };
      }
      case 'reduce': {
        if (!Array.isArray(data)) {
          throw new Error('Reduce transform requires array input');
        }
        const reduceFn = new Function('acc', 'item', 'index', `return ${step.expression}`);
        return { result: data.reduce((acc, item, index) => reduceFn(acc, item, index), null) };
      }
      case 'sort': {
        if (!Array.isArray(data)) {
          throw new Error('Sort transform requires array input');
        }
        const sortFn = new Function('a', 'b', `return ${step.expression}`);
        return { result: [...data].sort((a, b) => sortFn(a, b)) };
      }
      case 'custom':
      default: {
        const customFn = new Function('data', 'input', `return ${step.expression}`);
        return { result: customFn(data, input) };
      }
    }
  } catch (error) {
    throw new Error(`Transform failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
