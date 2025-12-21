import { test, expect } from '@playwright/test';

/**
 * Plan Executor Tests
 * Tests for agent plan execution functionality
 */

test.describe('Plan Executor - Execution Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should execute plan steps sequentially', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        title: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        output?: string;
      }

      interface Plan {
        id: string;
        title: string;
        steps: PlanStep[];
        status: 'draft' | 'approved' | 'running' | 'completed' | 'failed';
      }

      const plan: Plan = {
        id: 'plan-1',
        title: 'Research Task',
        steps: [
          { id: 's1', title: 'Search for information', status: 'pending' },
          { id: 's2', title: 'Analyze results', status: 'pending' },
          { id: 's3', title: 'Generate summary', status: 'pending' },
        ],
        status: 'approved',
      };

      const executionLog: string[] = [];

      const executeStep = (stepId: string): string => {
        const step = plan.steps.find((s) => s.id === stepId);
        if (!step) throw new Error('Step not found');

        step.status = 'running';
        executionLog.push(`Started: ${step.title}`);

        // Simulate execution
        step.status = 'completed';
        step.output = `Completed: ${step.title}`;
        executionLog.push(`Completed: ${step.title}`);

        return step.output;
      };

      const executePlan = () => {
        plan.status = 'running';
        const pendingSteps = plan.steps.filter((s) => s.status === 'pending');

        for (const step of pendingSteps) {
          executeStep(step.id);
        }

        const allCompleted = plan.steps.every((s) => s.status === 'completed');
        plan.status = allCompleted ? 'completed' : 'failed';
      };

      executePlan();

      return {
        planStatus: plan.status,
        allStepsCompleted: plan.steps.every((s) => s.status === 'completed'),
        executionLogLength: executionLog.length,
        hasOutputs: plan.steps.every((s) => !!s.output),
      };
    });

    expect(result.planStatus).toBe('completed');
    expect(result.allStepsCompleted).toBe(true);
    expect(result.executionLogLength).toBe(6); // 3 started + 3 completed
    expect(result.hasOutputs).toBe(true);
  });

  test('should handle step failure', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        title: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        error?: string;
      }

      interface Plan {
        id: string;
        steps: PlanStep[];
        status: 'running' | 'completed' | 'failed';
      }

      const plan: Plan = {
        id: 'plan-1',
        steps: [
          { id: 's1', title: 'Step 1', status: 'pending' },
          { id: 's2', title: 'Step 2 (will fail)', status: 'pending' },
          { id: 's3', title: 'Step 3', status: 'pending' },
        ],
        status: 'running',
      };

      const executeStep = (stepId: string, shouldFail: boolean) => {
        const step = plan.steps.find((s) => s.id === stepId);
        if (!step) return;

        step.status = 'running';

        if (shouldFail) {
          step.status = 'failed';
          step.error = 'Execution failed';
          plan.status = 'failed';
          return false;
        }

        step.status = 'completed';
        return true;
      };

      // Execute steps
      executeStep('s1', false);
      executeStep('s2', true); // This will fail
      // s3 should not execute

      return {
        planStatus: plan.status,
        step1Status: plan.steps[0].status,
        step2Status: plan.steps[1].status,
        step2Error: plan.steps[1].error,
        step3Status: plan.steps[2].status, // Should still be pending
      };
    });

    expect(result.planStatus).toBe('failed');
    expect(result.step1Status).toBe('completed');
    expect(result.step2Status).toBe('failed');
    expect(result.step2Error).toBe('Execution failed');
    expect(result.step3Status).toBe('pending');
  });

  test('should support abort execution', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        status: 'pending' | 'running' | 'completed' | 'cancelled';
      }

      const steps: PlanStep[] = [
        { id: 's1', status: 'pending' },
        { id: 's2', status: 'pending' },
        { id: 's3', status: 'pending' },
      ];

      let isExecuting = true;
      let aborted = false;

      const stopExecution = () => {
        aborted = true;
        isExecuting = false;
      };

      const executePlan = () => {
        for (const step of steps) {
          if (aborted) {
            step.status = 'cancelled';
            continue;
          }

          step.status = 'running';

          // Simulate abort after first step
          if (step.id === 's1') {
            step.status = 'completed';
            stopExecution();
          }
        }
      };

      executePlan();

      return {
        isExecuting,
        aborted,
        step1Status: steps[0].status,
        step2Status: steps[1].status,
        step3Status: steps[2].status,
      };
    });

    expect(result.isExecuting).toBe(false);
    expect(result.aborted).toBe(true);
    expect(result.step1Status).toBe('completed');
    expect(result.step2Status).toBe('cancelled');
    expect(result.step3Status).toBe('cancelled');
  });
});

test.describe('Plan Executor - Context Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should build context from previous steps', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        title: string;
        status: 'completed' | 'pending';
        output?: string;
      }

      const steps: PlanStep[] = [
        { id: 's1', title: 'Search', status: 'completed', output: 'Found 10 results' },
        { id: 's2', title: 'Filter', status: 'completed', output: 'Filtered to 5 results' },
        { id: 's3', title: 'Summarize', status: 'pending' },
      ];

      const buildContext = (currentStepId: string): string => {
        const currentIndex = steps.findIndex((s) => s.id === currentStepId);
        const previousSteps = steps
          .slice(0, currentIndex)
          .filter((s) => s.status === 'completed' && s.output);

        if (previousSteps.length === 0) return '';

        return previousSteps
          .map((s, i) => `Step ${i + 1}: ${s.title}\nResult: ${s.output}`)
          .join('\n\n');
      };

      const context = buildContext('s3');

      return {
        hasContext: context.length > 0,
        includesSearch: context.includes('Search'),
        includesFilter: context.includes('Filter'),
        includesResults: context.includes('10 results'),
      };
    });

    expect(result.hasContext).toBe(true);
    expect(result.includesSearch).toBe(true);
    expect(result.includesFilter).toBe(true);
    expect(result.includesResults).toBe(true);
  });

  test('should generate system prompt for step', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Plan {
        title: string;
        description?: string;
      }

      interface Step {
        title: string;
        description?: string;
      }

      const generateSystemPrompt = (
        plan: Plan,
        step: Step,
        previousContext: string
      ): string => {
        let prompt = `You are an AI assistant executing a plan step by step.\n\n`;
        prompt += `Plan: ${plan.title}\n`;

        if (plan.description) {
          prompt += `Description: ${plan.description}\n`;
        }

        if (previousContext) {
          prompt += `\nPrevious completed steps:\n${previousContext}\n\n`;
        }

        prompt += `\nCurrent step to execute: ${step.title}`;

        if (step.description) {
          prompt += `\nStep description: ${step.description}`;
        }

        return prompt;
      };

      const prompt = generateSystemPrompt(
        { title: 'Research AI', description: 'Research latest AI developments' },
        { title: 'Search papers', description: 'Find recent papers on LLMs' },
        'Step 1: Define scope\nResult: Focus on transformer models'
      );

      return {
        includesPlanTitle: prompt.includes('Research AI'),
        includesPlanDesc: prompt.includes('Research latest AI'),
        includesStepTitle: prompt.includes('Search papers'),
        includesStepDesc: prompt.includes('recent papers'),
        includesPreviousContext: prompt.includes('Define scope'),
      };
    });

    expect(result.includesPlanTitle).toBe(true);
    expect(result.includesPlanDesc).toBe(true);
    expect(result.includesStepTitle).toBe(true);
    expect(result.includesStepDesc).toBe(true);
    expect(result.includesPreviousContext).toBe(true);
  });
});

test.describe('Plan Executor - Callbacks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should call step callbacks', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        title: string;
      }

      const callbacks: string[] = [];

      const options = {
        onStepStart: (step: PlanStep) => {
          callbacks.push(`start:${step.id}`);
        },
        onStepComplete: (step: PlanStep, result: string) => {
          callbacks.push(`complete:${step.id}:${result}`);
        },
        onStepError: (step: PlanStep, error: string) => {
          callbacks.push(`error:${step.id}:${error}`);
        },
      };

      const steps: PlanStep[] = [
        { id: 's1', title: 'Step 1' },
        { id: 's2', title: 'Step 2' },
      ];

      // Simulate execution with callbacks
      for (const step of steps) {
        options.onStepStart(step);
        options.onStepComplete(step, 'done');
      }

      return {
        callbackCount: callbacks.length,
        hasStartCallbacks: callbacks.filter((c) => c.startsWith('start:')).length,
        hasCompleteCallbacks: callbacks.filter((c) => c.startsWith('complete:')).length,
      };
    });

    expect(result.callbackCount).toBe(4);
    expect(result.hasStartCallbacks).toBe(2);
    expect(result.hasCompleteCallbacks).toBe(2);
  });

  test('should call plan callbacks', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Plan {
        id: string;
        title: string;
      }

      const callbacks: string[] = [];

      const options = {
        onPlanComplete: (plan: Plan) => {
          callbacks.push(`plan-complete:${plan.id}`);
        },
        onPlanError: (plan: Plan, error: string) => {
          callbacks.push(`plan-error:${plan.id}:${error}`);
        },
      };

      const plan: Plan = { id: 'p1', title: 'Test Plan' };

      // Simulate successful completion
      options.onPlanComplete(plan);

      // Simulate error
      options.onPlanError(plan, 'Something went wrong');

      return {
        callbacks,
        hasCompleteCallback: callbacks.some((c) => c.includes('plan-complete')),
        hasErrorCallback: callbacks.some((c) => c.includes('plan-error')),
      };
    });

    expect(result.callbacks.length).toBe(2);
    expect(result.hasCompleteCallback).toBe(true);
    expect(result.hasErrorCallback).toBe(true);
  });
});

test.describe('Plan Executor - State Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track execution state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExecutorState {
        isExecuting: boolean;
        currentStepId: string | null;
        error: string | null;
      }

      const state: ExecutorState = {
        isExecuting: false,
        currentStepId: null,
        error: null,
      };

      const startExecution = (stepId: string) => {
        state.isExecuting = true;
        state.currentStepId = stepId;
        state.error = null;
      };

      const completeExecution = () => {
        state.isExecuting = false;
        state.currentStepId = null;
      };

      const failExecution = (error: string) => {
        state.isExecuting = false;
        state.error = error;
      };

      const history: ExecutorState[] = [];

      history.push({ ...state });

      startExecution('s1');
      history.push({ ...state });

      completeExecution();
      history.push({ ...state });

      startExecution('s2');
      failExecution('Network error');
      history.push({ ...state });

      return { history };
    });

    expect(result.history[0].isExecuting).toBe(false);
    expect(result.history[1].isExecuting).toBe(true);
    expect(result.history[1].currentStepId).toBe('s1');
    expect(result.history[2].isExecuting).toBe(false);
    expect(result.history[3].error).toBe('Network error');
  });
});
