/**
 * Conditional Step Executor Tests
 */

import { executeConditionalStep } from './conditional-executor';
import type { WorkflowStepDefinition, WorkflowExecution } from './types';

const createStep = (overrides: Partial<WorkflowStepDefinition>): WorkflowStepDefinition => ({
  id: 'test-step',
  name: 'Test Step',
  description: 'Test step description',
  type: 'conditional',
  inputs: {},
  outputs: {},
  ...overrides,
} as WorkflowStepDefinition);

describe('executeConditionalStep', () => {
  const mockExecution = {
    id: 'exec-1',
    workflowId: 'workflow-1',
    status: 'running',
    startedAt: new Date(),
    context: {},
    stepResults: new Map(),
  } as unknown as WorkflowExecution;

  it('should return input when no condition specified', async () => {
    const step = createStep({
      id: 'cond-1',
      name: 'No Condition',
    });
    const input = { value: 42 };

    const result = await executeConditionalStep(step, input, mockExecution);

    expect(result).toEqual(input);
  });

  it('should evaluate simple true condition', async () => {
    const step = createStep({ id: 'cond-2', name: 'True Condition', condition: 'true' });
    const input = { value: 42 };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: true, value: 42 });
  });

  it('should evaluate simple false condition', async () => {
    const step = createStep({ id: 'cond-3', name: 'False Condition', condition: 'false' });
    const input = { value: 42 };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: false, value: 42 });
  });

  it('should evaluate condition with input variables', async () => {
    const step = createStep({ id: 'cond-4', name: 'Variable Condition', condition: 'value > 10' });
    const input = { value: 42 };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: true, value: 42 });
  });

  it('should evaluate condition with multiple variables', async () => {
    const step = createStep({ id: 'cond-5', name: 'Multi Variable', condition: 'a + b > 100' });
    const input = { a: 50, b: 60 };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: true, a: 50, b: 60 });
  });

  it('should evaluate string comparisons', async () => {
    const step = createStep({ id: 'cond-6', name: 'String', condition: 'status === "active"' });
    const input = { status: 'active' };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: true, status: 'active' });
  });

  it('should evaluate array length conditions', async () => {
    const step = createStep({ id: 'cond-7', name: 'Array', condition: 'items.length > 0' });
    const input = { items: [1, 2, 3] };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: true, items: [1, 2, 3] });
  });

  it('should evaluate boolean logic', async () => {
    const step = createStep({ id: 'cond-8', name: 'Boolean', condition: 'enabled && count > 5' });
    const input = { enabled: true, count: 10 };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: true, enabled: true, count: 10 });
  });

  it('should throw error for invalid condition', async () => {
    const step = createStep({ id: 'cond-9', name: 'Invalid', condition: 'this is not valid!!!' });
    const input = { value: 42 };
    await expect(executeConditionalStep(step, input, mockExecution)).rejects.toThrow('Failed to evaluate condition');
  });

  it('should throw error for condition with undefined variables', async () => {
    const step = createStep({ id: 'cond-10', name: 'Undefined', condition: 'undefinedVar.property > 10' });
    const input = { value: 42 };
    await expect(executeConditionalStep(step, input, mockExecution)).rejects.toThrow('Failed to evaluate condition');
  });

  it('should handle null values in input', async () => {
    const step = createStep({ id: 'cond-11', name: 'Null Check', condition: 'value === null' });
    const input = { value: null };
    const result = await executeConditionalStep(step, input, mockExecution);
    expect(result).toEqual({ conditionResult: true, value: null });
  });

  it('should handle empty input object', async () => {
    const step = createStep({ id: 'cond-12', name: 'Empty Input', condition: 'true' });
    const input = {};

    const result = await executeConditionalStep(step, input, mockExecution);

    expect(result).toEqual({ conditionResult: true });
  });
});
