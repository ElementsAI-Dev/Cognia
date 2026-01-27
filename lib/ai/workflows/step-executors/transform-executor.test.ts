/**
 * Transform Step Executor Tests
 */

import { executeTransformStep } from './transform-executor';
import type { WorkflowStepDefinition } from './types';

const createStep = (overrides: Partial<WorkflowStepDefinition>): WorkflowStepDefinition => ({
  id: 'test-step',
  name: 'Test Step',
  description: 'Test step description',
  type: 'transform',
  inputs: {},
  outputs: {},
  ...overrides,
} as WorkflowStepDefinition);

describe('executeTransformStep', () => {
  it('should return input when no expression specified', async () => {
    const step = createStep({ id: 'transform-1', name: 'No Transform' });
    const input = { value: 42 };
    const result = await executeTransformStep(step, input);
    expect(result).toEqual(input);
  });

  describe('map transform', () => {
    it('should map array elements', async () => {
      const step = createStep({
        id: 'transform-map',
        name: 'Map Transform',
        transformType: 'map',
        expression: 'item * 2',
      });
      const input = { data: [1, 2, 3] };
      const result = await executeTransformStep(step, input);
      expect(result).toEqual({ result: [2, 4, 6] });
    });

    it('should throw error for non-array input', async () => {
      const step = createStep({
        id: 'transform-map-error',
        name: 'Map Error',
        transformType: 'map',
        expression: 'item * 2',
      });
      const input = { data: 'not an array' };
      await expect(executeTransformStep(step, input)).rejects.toThrow('Map transform requires array input');
    });
  });

  describe('filter transform', () => {
    it('should filter array elements', async () => {
      const step = createStep({
        id: 'transform-filter',
        name: 'Filter Transform',
        transformType: 'filter',
        expression: 'item > 2',
      });
      const input = { data: [1, 2, 3, 4, 5] };
      const result = await executeTransformStep(step, input);
      expect(result).toEqual({ result: [3, 4, 5] });
    });

    it('should throw error for non-array input', async () => {
      const step = createStep({
        id: 'transform-filter-error',
        name: 'Filter Error',
        transformType: 'filter',
        expression: 'item > 2',
      });
      const input = { data: 123 };
      await expect(executeTransformStep(step, input)).rejects.toThrow('Filter transform requires array input');
    });
  });

  describe('reduce transform', () => {
    it('should reduce array elements', async () => {
      const step = createStep({
        id: 'transform-reduce',
        name: 'Reduce Transform',
        transformType: 'reduce',
        expression: '(acc || 0) + item',
      });
      const input = { data: [1, 2, 3, 4, 5] };
      const result = await executeTransformStep(step, input);
      expect(result).toEqual({ result: 15 });
    });

    it('should throw error for non-array input', async () => {
      const step = createStep({
        id: 'transform-reduce-error',
        name: 'Reduce Error',
        transformType: 'reduce',
        expression: 'acc + item',
      });
      const input = { data: 'not array' };
      await expect(executeTransformStep(step, input)).rejects.toThrow('Reduce transform requires array input');
    });
  });

  describe('sort transform', () => {
    it('should sort array elements', async () => {
      const step = createStep({
        id: 'transform-sort',
        name: 'Sort Transform',
        transformType: 'sort',
        expression: 'a - b',
      });
      const input = { data: [3, 1, 4, 1, 5, 9, 2, 6] };
      const result = await executeTransformStep(step, input);
      expect(result).toEqual({ result: [1, 1, 2, 3, 4, 5, 6, 9] });
    });

    it('should throw error for non-array input', async () => {
      const step = createStep({
        id: 'transform-sort-error',
        name: 'Sort Error',
        transformType: 'sort',
        expression: 'a - b',
      });
      const input = { data: 'not array' };
      await expect(executeTransformStep(step, input)).rejects.toThrow('Sort transform requires array input');
    });
  });

  describe('custom transform', () => {
    it('should execute custom expression', async () => {
      const step = createStep({
        id: 'transform-custom',
        name: 'Custom Transform',
        transformType: 'custom',
        expression: 'data.value * 2',
      });
      const input = { value: 21 };
      const result = await executeTransformStep(step, input);
      expect(result).toEqual({ result: 42 });
    });

    it('should handle default transformType as custom', async () => {
      const step = createStep({
        id: 'transform-default',
        name: 'Default Transform',
        expression: 'data.a + data.b',
      });
      const input = { a: 10, b: 20 };
      const result = await executeTransformStep(step, input);
      expect(result).toEqual({ result: 30 });
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid expression', async () => {
      const step = createStep({
        id: 'transform-error',
        name: 'Error Transform',
        transformType: 'custom',
        expression: 'this.is.not.valid!!!',
      });
      const input = { value: 42 };
      await expect(executeTransformStep(step, input)).rejects.toThrow('Transform failed');
    });
  });
});
