/**
 * Sequential Generations - Chain AI calls for complex workflows
 * 
 * Implements patterns for sequential AI generations where
 * the output of one generation becomes the input for the next.
 * 
 * Based on AI SDK documentation:
 * https://ai-sdk.dev/docs/advanced/sequential-generations
 */

import { generateText, streamText, type LanguageModel, type CoreMessage } from 'ai';

/**
 * Generation step configuration
 */
export interface GenerationStep<TContext> {
  /** Unique identifier for this step */
  id: string;
  /** Human-readable name for this step */
  name: string;
  /** Build the prompt for this step from context */
  buildPrompt: (context: TContext) => string | CoreMessage[];
  /** Process the generation result and update context */
  processResult: (result: string, context: TContext) => TContext;
  /** Optional: Custom model for this step */
  model?: LanguageModel;
  /** Optional: System prompt for this step */
  system?: string;
  /** Optional: Temperature override */
  temperature?: number;
  /** Optional: Max tokens override */
  maxTokens?: number;
  /** Optional: Whether to skip this step based on context */
  shouldSkip?: (context: TContext) => boolean;
}

/**
 * Sequential generation options
 */
export interface SequentialGenerationOptions<TContext> {
  /** The language model to use (can be overridden per step) */
  model: LanguageModel;
  /** Initial context */
  initialContext: TContext;
  /** Generation steps to execute */
  steps: GenerationStep<TContext>[];
  /** Callback for step start */
  onStepStart?: (stepId: string, stepName: string, context: TContext) => void;
  /** Callback for step completion */
  onStepComplete?: (stepId: string, stepName: string, result: string, context: TContext) => void;
  /** Callback for errors */
  onError?: (stepId: string, error: Error) => void;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Sequential generation result
 */
export interface SequentialGenerationResult<TContext> {
  /** Final context after all steps */
  context: TContext;
  /** Results from each step */
  stepResults: Map<string, string>;
  /** Steps that were skipped */
  skippedSteps: string[];
  /** Total duration in ms */
  durationMs: number;
}

/**
 * Execute sequential generations
 * 
 * Runs a series of AI generation steps in sequence, where each step
 * can access and modify a shared context.
 */
export async function runSequentialGeneration<TContext>(
  options: SequentialGenerationOptions<TContext>
): Promise<SequentialGenerationResult<TContext>> {
  const {
    model: defaultModel,
    initialContext,
    steps,
    onStepStart,
    onStepComplete,
    onError,
    abortSignal,
  } = options;

  const startTime = Date.now();
  let context = initialContext;
  const stepResults = new Map<string, string>();
  const skippedSteps: string[] = [];

  for (const step of steps) {
    // Check for abort
    if (abortSignal?.aborted) {
      throw new Error('Sequential generation aborted');
    }

    // Check if step should be skipped
    if (step.shouldSkip?.(context)) {
      skippedSteps.push(step.id);
      continue;
    }

    onStepStart?.(step.id, step.name, context);

    try {
      const prompt = step.buildPrompt(context);
      const model = step.model || defaultModel;

      const result = await generateText({
        model,
        ...(typeof prompt === 'string' ? { prompt } : { messages: prompt }),
        ...(step.system && { system: step.system }),
        ...(step.temperature !== undefined && { temperature: step.temperature }),
        ...(step.maxTokens !== undefined && { maxTokens: step.maxTokens }),
        abortSignal,
      });

      const text = result.text;
      stepResults.set(step.id, text);
      context = step.processResult(text, context);

      onStepComplete?.(step.id, step.name, text, context);
    } catch (error) {
      onError?.(step.id, error as Error);
      throw error;
    }
  }

  return {
    context,
    stepResults,
    skippedSteps,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Streaming sequential generation step result
 */
export interface StreamingStepResult {
  stepId: string;
  text: string;
  isComplete: boolean;
}

/**
 * Execute sequential generations with streaming
 * 
 * Similar to runSequentialGeneration but streams each step's output.
 */
export async function* runStreamingSequentialGeneration<TContext>(
  options: SequentialGenerationOptions<TContext>
): AsyncGenerator<StreamingStepResult, SequentialGenerationResult<TContext>, unknown> {
  const {
    model: defaultModel,
    initialContext,
    steps,
    onStepStart,
    onStepComplete,
    onError,
    abortSignal,
  } = options;

  const startTime = Date.now();
  let context = initialContext;
  const stepResults = new Map<string, string>();
  const skippedSteps: string[] = [];

  for (const step of steps) {
    if (abortSignal?.aborted) {
      throw new Error('Sequential generation aborted');
    }

    if (step.shouldSkip?.(context)) {
      skippedSteps.push(step.id);
      continue;
    }

    onStepStart?.(step.id, step.name, context);

    try {
      const prompt = step.buildPrompt(context);
      const model = step.model || defaultModel;

      const result = streamText({
        model,
        ...(typeof prompt === 'string' ? { prompt } : { messages: prompt }),
        ...(step.system && { system: step.system }),
        ...(step.temperature !== undefined && { temperature: step.temperature }),
        ...(step.maxTokens !== undefined && { maxTokens: step.maxTokens }),
        abortSignal,
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
        yield {
          stepId: step.id,
          text: chunk,
          isComplete: false,
        };
      }

      // Signal step completion
      yield {
        stepId: step.id,
        text: '',
        isComplete: true,
      };

      stepResults.set(step.id, fullText);
      context = step.processResult(fullText, context);

      onStepComplete?.(step.id, step.name, fullText, context);
    } catch (error) {
      onError?.(step.id, error as Error);
      throw error;
    }
  }

  return {
    context,
    stepResults,
    skippedSteps,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Simple chain function for quick sequential generations
 */
export async function chain(
  model: LanguageModel,
  prompts: string[],
  options?: {
    system?: string;
    temperature?: number;
    separator?: string;
    abortSignal?: AbortSignal;
  }
): Promise<string[]> {
  const { system, temperature, separator = '\n\n', abortSignal } = options || {};
  const results: string[] = [];
  let contextText = '';

  for (const prompt of prompts) {
    if (abortSignal?.aborted) {
      throw new Error('Chain aborted');
    }

    // Build prompt with context from previous results
    const fullPrompt = contextText ? `${contextText}${separator}${prompt}` : prompt;

    const result = await generateText({
      model,
      prompt: fullPrompt,
      ...(system && { system }),
      ...(temperature !== undefined && { temperature }),
      abortSignal,
    });

    results.push(result.text);
    contextText = result.text;
  }

  return results;
}

/**
 * Parallel-then-combine pattern
 * 
 * Run multiple generations in parallel, then combine results with a final generation.
 */
export async function parallelThenCombine(
  model: LanguageModel,
  parallelPrompts: string[],
  combinePrompt: (results: string[]) => string,
  options?: {
    system?: string;
    temperature?: number;
    abortSignal?: AbortSignal;
  }
): Promise<{ parallelResults: string[]; combinedResult: string }> {
  const { system, temperature, abortSignal } = options || {};

  // Run parallel generations
  const parallelResults = await Promise.all(
    parallelPrompts.map((prompt) =>
      generateText({
        model,
        prompt,
        ...(system && { system }),
        ...(temperature !== undefined && { temperature }),
        abortSignal,
      }).then((r) => r.text)
    )
  );

  // Combine results
  const combinedPrompt = combinePrompt(parallelResults);
  const combinedResult = await generateText({
    model,
    prompt: combinedPrompt,
    ...(system && { system }),
    ...(temperature !== undefined && { temperature }),
    abortSignal,
  });

  return {
    parallelResults,
    combinedResult: combinedResult.text,
  };
}

/**
 * Iterative refinement pattern
 * 
 * Generate an initial result, then iteratively refine it.
 */
export async function iterativeRefinement(
  model: LanguageModel,
  initialPrompt: string,
  refinePrompt: (currentResult: string, iteration: number) => string,
  options?: {
    maxIterations?: number;
    stopCondition?: (result: string, iteration: number) => boolean;
    system?: string;
    temperature?: number;
    abortSignal?: AbortSignal;
  }
): Promise<{ result: string; iterations: number; history: string[] }> {
  const {
    maxIterations = 3,
    stopCondition,
    system,
    temperature,
    abortSignal,
  } = options || {};

  const history: string[] = [];

  // Initial generation
  let currentResult = await generateText({
    model,
    prompt: initialPrompt,
    ...(system && { system }),
    ...(temperature !== undefined && { temperature }),
    abortSignal,
  }).then((r) => r.text);

  history.push(currentResult);

  // Refinement iterations
  for (let i = 0; i < maxIterations; i++) {
    if (abortSignal?.aborted) {
      throw new Error('Refinement aborted');
    }

    // Check stop condition
    if (stopCondition?.(currentResult, i + 1)) {
      break;
    }

    const prompt = refinePrompt(currentResult, i + 1);
    currentResult = await generateText({
      model,
      prompt,
      ...(system && { system }),
      ...(temperature !== undefined && { temperature }),
      abortSignal,
    }).then((r) => r.text);

    history.push(currentResult);
  }

  return {
    result: currentResult,
    iterations: history.length,
    history,
  };
}
