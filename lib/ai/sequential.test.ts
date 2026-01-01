/**
 * Sequential Generations Tests
 */

import {
  runSequentialGeneration,
  chain,
  parallelThenCombine,
  iterativeRefinement,
  type GenerationStep,
} from './sequential';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
}));

import { generateText } from 'ai';

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

describe('Sequential Generations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runSequentialGeneration', () => {
    it('should execute steps in sequence', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Step 1 result' } as never)
        .mockResolvedValueOnce({ text: 'Step 2 result' } as never);

      interface TestContext {
        step1Result?: string;
        step2Result?: string;
      }

      const steps: GenerationStep<TestContext>[] = [
        {
          id: 'step1',
          name: 'First Step',
          buildPrompt: () => 'Generate step 1',
          processResult: (result, ctx) => ({ ...ctx, step1Result: result }),
        },
        {
          id: 'step2',
          name: 'Second Step',
          buildPrompt: (ctx) => `Build on: ${ctx.step1Result}`,
          processResult: (result, ctx) => ({ ...ctx, step2Result: result }),
        },
      ];

      const result = await runSequentialGeneration({
        model: {} as never,
        initialContext: {},
        steps,
      });

      expect(result.context.step1Result).toBe('Step 1 result');
      expect(result.context.step2Result).toBe('Step 2 result');
      expect(result.stepResults.size).toBe(2);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it('should skip steps when shouldSkip returns true', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'Result' } as never);

      interface TestContext {
        skipSecond: boolean;
        result?: string;
      }

      const steps: GenerationStep<TestContext>[] = [
        {
          id: 'step1',
          name: 'First Step',
          buildPrompt: () => 'Generate',
          processResult: (result, ctx) => ({ ...ctx, result }),
        },
        {
          id: 'step2',
          name: 'Skipped Step',
          shouldSkip: (ctx) => ctx.skipSecond,
          buildPrompt: () => 'Should not run',
          processResult: (result, ctx) => ({ ...ctx, result }),
        },
      ];

      const result = await runSequentialGeneration({
        model: {} as never,
        initialContext: { skipSecond: true },
        steps,
      });

      expect(result.skippedSteps).toContain('step2');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('should call onStepStart and onStepComplete callbacks', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'Result' } as never);

      const onStepStart = jest.fn();
      const onStepComplete = jest.fn();

      const steps: GenerationStep<object>[] = [
        {
          id: 'step1',
          name: 'Test Step',
          buildPrompt: () => 'Test',
          processResult: (_, ctx) => ctx,
        },
      ];

      await runSequentialGeneration({
        model: {} as never,
        initialContext: {},
        steps,
        onStepStart,
        onStepComplete,
      });

      expect(onStepStart).toHaveBeenCalledWith('step1', 'Test Step', {});
      expect(onStepComplete).toHaveBeenCalledWith('step1', 'Test Step', 'Result', {});
    });

    it('should handle errors and call onError', async () => {
      const error = new Error('Generation failed');
      mockGenerateText.mockRejectedValueOnce(error);

      const onError = jest.fn();

      const steps: GenerationStep<object>[] = [
        {
          id: 'step1',
          name: 'Failing Step',
          buildPrompt: () => 'Test',
          processResult: (_, ctx) => ctx,
        },
      ];

      await expect(
        runSequentialGeneration({
          model: {} as never,
          initialContext: {},
          steps,
          onError,
        })
      ).rejects.toThrow('Generation failed');

      expect(onError).toHaveBeenCalledWith('step1', error);
    });
  });

  describe('chain', () => {
    it('should chain multiple prompts', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Ideas: A, B, C' } as never)
        .mockResolvedValueOnce({ text: 'Best: A' } as never)
        .mockResolvedValueOnce({ text: 'Outline for A' } as never);

      const results = await chain({} as never, [
        'Generate ideas',
        'Pick the best',
        'Create outline',
      ]);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('Ideas: A, B, C');
      expect(results[1]).toBe('Best: A');
      expect(results[2]).toBe('Outline for A');
    });

    it('should use custom separator', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'First' } as never)
        .mockResolvedValueOnce({ text: 'Second' } as never);

      await chain({} as never, ['Prompt 1', 'Prompt 2'], { separator: '---' });

      // Second call should include first result with separator
      expect(mockGenerateText).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          prompt: expect.stringContaining('---'),
        })
      );
    });
  });

  describe('parallelThenCombine', () => {
    it('should run parallel prompts and combine results', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Parallel 1' } as never)
        .mockResolvedValueOnce({ text: 'Parallel 2' } as never)
        .mockResolvedValueOnce({ text: 'Combined result' } as never);

      const result = await parallelThenCombine(
        {} as never,
        ['Generate A', 'Generate B'],
        (results) => `Combine: ${results.join(', ')}`
      );

      expect(result.parallelResults).toEqual(['Parallel 1', 'Parallel 2']);
      expect(result.combinedResult).toBe('Combined result');
    });
  });

  describe('iterativeRefinement', () => {
    it('should refine output iteratively', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Draft 1' } as never)
        .mockResolvedValueOnce({ text: 'Draft 2' } as never)
        .mockResolvedValueOnce({ text: 'Final' } as never);

      const result = await iterativeRefinement(
        {} as never,
        'Write initial draft',
        (current, iteration) => `Refine (iteration ${iteration}): ${current}`,
        { maxIterations: 2 }
      );

      expect(result.result).toBe('Final');
      expect(result.iterations).toBe(3); // Initial + 2 refinements
      expect(result.history).toEqual(['Draft 1', 'Draft 2', 'Final']);
    });

    it('should stop early when stopCondition is met', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Almost done' } as never)
        .mockResolvedValueOnce({ text: 'DONE: Perfect' } as never);

      const result = await iterativeRefinement(
        {} as never,
        'Start',
        (current) => `Improve: ${current}`,
        {
          maxIterations: 5,
          stopCondition: (result) => result.startsWith('DONE'),
        }
      );

      expect(result.result).toBe('DONE: Perfect');
      expect(result.iterations).toBe(2);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });
  });
});
