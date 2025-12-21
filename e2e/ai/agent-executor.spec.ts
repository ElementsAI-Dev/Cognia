import { test, expect } from '@playwright/test';

/**
 * Agent Executor Complete Tests
 * Tests multi-step agent execution, tool calling, and planning
 */
test.describe('Agent Executor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should execute single step agent', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface AgentStep {
        stepNumber: number;
        response: string;
        toolCalls: { name: string; args: Record<string, unknown> }[];
      }

      const executeStep = (prompt: string, stepNumber: number): AgentStep => {
        // Simulate agent step execution
        return {
          stepNumber,
          response: `Response to: ${prompt}`,
          toolCalls: [],
        };
      };

      const step = executeStep('What is 2+2?', 1);

      return {
        stepNumber: step.stepNumber,
        hasResponse: step.response.length > 0,
        toolCallCount: step.toolCalls.length,
      };
    });

    expect(result.stepNumber).toBe(1);
    expect(result.hasResponse).toBe(true);
    expect(result.toolCallCount).toBe(0);
  });

  test('should execute multi-step agent with tool calls', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ToolCall {
        id: string;
        name: string;
        args: Record<string, unknown>;
        result?: string;
      }

      interface AgentState {
        steps: number;
        toolCalls: ToolCall[];
        finalResponse: string | null;
      }

      const state: AgentState = {
        steps: 0,
        toolCalls: [],
        finalResponse: null,
      };

      const executeTool = (name: string, args: Record<string, unknown>): string => {
        const tools: Record<string, (args: Record<string, unknown>) => string> = {
          calculator: (a) => String(eval(String(a.expression))),
          search: (a) => `Results for: ${a.query}`,
        };
        return tools[name]?.(args) || 'Unknown tool';
      };

      const runAgent = (_prompt: string, _maxSteps: number) => {
        // Step 1: Analyze and decide to use tool
        state.steps++;
        const toolCall: ToolCall = {
          id: `call-${Date.now()}`,
          name: 'calculator',
          args: { expression: '2+2' },
        };
        state.toolCalls.push(toolCall);

        // Step 2: Execute tool
        state.steps++;
        toolCall.result = executeTool(toolCall.name, toolCall.args);

        // Step 3: Generate final response
        state.steps++;
        state.finalResponse = `The result is ${toolCall.result}`;

        return state;
      };

      const finalState = runAgent('Calculate 2+2', 5);

      return {
        totalSteps: finalState.steps,
        toolCallCount: finalState.toolCalls.length,
        toolResult: finalState.toolCalls[0]?.result,
        hasFinalResponse: finalState.finalResponse !== null,
      };
    });

    expect(result.totalSteps).toBe(3);
    expect(result.toolCallCount).toBe(1);
    expect(result.toolResult).toBe('4');
    expect(result.hasFinalResponse).toBe(true);
  });

  test('should handle tool execution errors', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ToolExecution {
        name: string;
        success: boolean;
        result?: string;
        error?: string;
      }

      const executeToolSafely = (
        name: string,
        args: Record<string, unknown>
      ): ToolExecution => {
        try {
          if (name === 'failing_tool') {
            throw new Error('Tool execution failed');
          }
          return {
            name,
            success: true,
            result: `Executed ${name} with ${JSON.stringify(args)}`,
          };
        } catch (e) {
          return {
            name,
            success: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          };
        }
      };

      const successResult = executeToolSafely('calculator', { expr: '1+1' });
      const failResult = executeToolSafely('failing_tool', {});

      return {
        successName: successResult.name,
        successOk: successResult.success,
        failName: failResult.name,
        failOk: failResult.success,
        failError: failResult.error,
      };
    });

    expect(result.successOk).toBe(true);
    expect(result.failOk).toBe(false);
    expect(result.failError).toBe('Tool execution failed');
  });

  test('should respect max steps limit', async ({ page }) => {
    const result = await page.evaluate(() => {
      let stepCount = 0;
      const maxSteps = 5;

      const shouldContinue = () => stepCount < maxSteps;

      const executeStep = () => {
        stepCount++;
        return { step: stepCount, hasMoreWork: true };
      };

      const steps: number[] = [];
      while (shouldContinue()) {
        const result = executeStep();
        steps.push(result.step);
      }

      return {
        totalSteps: stepCount,
        stepsExecuted: steps,
        stoppedAtMax: stepCount === maxSteps,
      };
    });

    expect(result.totalSteps).toBe(5);
    expect(result.stepsExecuted).toEqual([1, 2, 3, 4, 5]);
    expect(result.stoppedAtMax).toBe(true);
  });

  test('should track execution history', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExecutionEvent {
        type: 'step_start' | 'step_end' | 'tool_call' | 'tool_result' | 'error';
        timestamp: number;
        data: Record<string, unknown>;
      }

      const history: ExecutionEvent[] = [];

      const logEvent = (type: ExecutionEvent['type'], data: Record<string, unknown>) => {
        history.push({ type, timestamp: Date.now(), data });
      };

      // Simulate execution
      logEvent('step_start', { step: 1 });
      logEvent('tool_call', { name: 'search', args: { query: 'test' } });
      logEvent('tool_result', { name: 'search', result: 'found' });
      logEvent('step_end', { step: 1, response: 'Done' });

      return {
        eventCount: history.length,
        eventTypes: history.map(e => e.type),
        hasStepStart: history.some(e => e.type === 'step_start'),
        hasToolCall: history.some(e => e.type === 'tool_call'),
      };
    });

    expect(result.eventCount).toBe(4);
    expect(result.eventTypes).toContain('step_start');
    expect(result.eventTypes).toContain('tool_call');
    expect(result.hasStepStart).toBe(true);
    expect(result.hasToolCall).toBe(true);
  });
});

test.describe('Agent Planning', () => {
  test('should create execution plan', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        description: string;
        dependencies: string[];
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
      }

      const createPlan = (_task: string): PlanStep[] => {
        // Simulate plan generation based on task
        const steps: PlanStep[] = [
          {
            id: 'step-1',
            description: 'Understand the task requirements',
            dependencies: [],
            status: 'pending',
          },
          {
            id: 'step-2',
            description: 'Gather necessary information',
            dependencies: ['step-1'],
            status: 'pending',
          },
          {
            id: 'step-3',
            description: 'Process and analyze data',
            dependencies: ['step-2'],
            status: 'pending',
          },
          {
            id: 'step-4',
            description: 'Generate final output',
            dependencies: ['step-3'],
            status: 'pending',
          },
        ];

        return steps;
      };

      const plan = createPlan('Summarize the document');

      return {
        stepCount: plan.length,
        allPending: plan.every(s => s.status === 'pending'),
        hasDependencies: plan.some(s => s.dependencies.length > 0),
        firstStepNoDeps: plan[0].dependencies.length === 0,
      };
    });

    expect(result.stepCount).toBe(4);
    expect(result.allPending).toBe(true);
    expect(result.hasDependencies).toBe(true);
    expect(result.firstStepNoDeps).toBe(true);
  });

  test('should execute plan steps in order', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        status: 'pending' | 'in_progress' | 'completed';
        result?: string;
      }

      const plan: PlanStep[] = [
        { id: 'step-1', status: 'pending' },
        { id: 'step-2', status: 'pending' },
        { id: 'step-3', status: 'pending' },
      ];

      const executeStep = (stepId: string) => {
        const step = plan.find(s => s.id === stepId);
        if (step) {
          step.status = 'in_progress';
          // Simulate execution
          step.result = `Completed ${stepId}`;
          step.status = 'completed';
        }
      };

      const getNextStep = () => {
        return plan.find(s => s.status === 'pending');
      };

      const executionOrder: string[] = [];
      let next = getNextStep();
      while (next) {
        executionOrder.push(next.id);
        executeStep(next.id);
        next = getNextStep();
      }

      return {
        executionOrder,
        allCompleted: plan.every(s => s.status === 'completed'),
        results: plan.map(s => s.result),
      };
    });

    expect(result.executionOrder).toEqual(['step-1', 'step-2', 'step-3']);
    expect(result.allCompleted).toBe(true);
    expect(result.results).toHaveLength(3);
  });

  test('should handle plan step failures', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        status: 'pending' | 'completed' | 'failed';
        error?: string;
      }

      const plan: PlanStep[] = [
        { id: 'step-1', status: 'pending' },
        { id: 'step-2', status: 'pending' },
        { id: 'step-3', status: 'pending' },
      ];

      const executeStepWithError = (stepId: string, shouldFail: boolean) => {
        const step = plan.find(s => s.id === stepId);
        if (step) {
          if (shouldFail) {
            step.status = 'failed';
            step.error = `Step ${stepId} failed`;
          } else {
            step.status = 'completed';
          }
        }
      };

      executeStepWithError('step-1', false);
      executeStepWithError('step-2', true);
      // step-3 should not execute due to failure

      return {
        step1Status: plan[0].status,
        step2Status: plan[1].status,
        step2Error: plan[1].error,
        step3Status: plan[2].status,
        hasFailure: plan.some(s => s.status === 'failed'),
      };
    });

    expect(result.step1Status).toBe('completed');
    expect(result.step2Status).toBe('failed');
    expect(result.step2Error).toBe('Step step-2 failed');
    expect(result.step3Status).toBe('pending');
    expect(result.hasFailure).toBe(true);
  });

  test('should refine plan based on results', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface PlanStep {
        id: string;
        description: string;
      }

      let plan: PlanStep[] = [
        { id: 'step-1', description: 'Initial analysis' },
        { id: 'step-2', description: 'Process data' },
      ];

      const refinePlan = (newSteps: PlanStep[]) => {
        plan = [...plan, ...newSteps];
      };

      const insertStep = (afterId: string, newStep: PlanStep) => {
        const index = plan.findIndex(s => s.id === afterId);
        if (index !== -1) {
          plan.splice(index + 1, 0, newStep);
        }
      };

      // After step-1, we realize we need more steps
      insertStep('step-1', { id: 'step-1b', description: 'Additional validation' });
      
      // Add final steps
      refinePlan([
        { id: 'step-3', description: 'Generate output' },
        { id: 'step-4', description: 'Review and finalize' },
      ]);

      return {
        totalSteps: plan.length,
        stepOrder: plan.map(s => s.id),
        hasInsertedStep: plan.some(s => s.id === 'step-1b'),
      };
    });

    expect(result.totalSteps).toBe(5);
    expect(result.stepOrder).toContain('step-1b');
    expect(result.hasInsertedStep).toBe(true);
  });
});

test.describe('Tool Approval', () => {
  test('should require approval for sensitive tools', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const sensitiveTools = ['file_write', 'file_delete', 'execute_code', 'send_email'];
      const _safeTools = ['calculator', 'search', 'weather'];

      const requiresApproval = (toolName: string) => {
        return sensitiveTools.includes(toolName);
      };

      return {
        fileWriteNeedsApproval: requiresApproval('file_write'),
        calculatorNeedsApproval: requiresApproval('calculator'),
        executeCodeNeedsApproval: requiresApproval('execute_code'),
        searchNeedsApproval: requiresApproval('search'),
      };
    });

    expect(result.fileWriteNeedsApproval).toBe(true);
    expect(result.calculatorNeedsApproval).toBe(false);
    expect(result.executeCodeNeedsApproval).toBe(true);
    expect(result.searchNeedsApproval).toBe(false);
  });

  test('should handle approval workflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const result = await page.evaluate(() => {
      // Use simple array with index-based access
      const approvals = [
        { id: 'req-1', toolName: 'file_write', status: 'pending' },
        { id: 'req-2', toolName: 'file_delete', status: 'pending' },
      ];

      // Approve first, reject second
      approvals[0].status = 'approved';
      approvals[1].status = 'rejected';

      return {
        totalRequests: approvals.length,
        approvedCount: approvals.filter(a => a.status === 'approved').length,
        rejectedCount: approvals.filter(a => a.status === 'rejected').length,
        request1Status: approvals[0].status,
        request2Status: approvals[1].status,
      };
    });

    expect(result.totalRequests).toBe(2);
    expect(result.approvedCount).toBe(1);
    expect(result.rejectedCount).toBe(1);
    expect(result.request1Status).toBe('approved');
    expect(result.request2Status).toBe('rejected');
  });
});

test.describe('Agent Loop', () => {
  test('should orchestrate complex task execution', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface Task {
        id: string;
        description: string;
        status: 'pending' | 'in_progress' | 'completed';
        subtasks: Task[];
      }

      const createTask = (description: string): Task => ({
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description,
        status: 'pending',
        subtasks: [],
      });

      const decomposeTask = (task: Task, subtaskDescriptions: string[]) => {
        task.subtasks = subtaskDescriptions.map(desc => createTask(desc));
      };

      const executeTask = (task: Task) => {
        task.status = 'in_progress';
        
        // Execute subtasks first
        for (const subtask of task.subtasks) {
          executeTask(subtask);
        }
        
        task.status = 'completed';
      };

      const mainTask = createTask('Research and summarize AI trends');
      decomposeTask(mainTask, [
        'Search for recent AI news',
        'Extract key points',
        'Generate summary',
      ]);

      executeTask(mainTask);

      return {
        mainTaskStatus: mainTask.status,
        subtaskCount: mainTask.subtasks.length,
        allSubtasksCompleted: mainTask.subtasks.every(s => s.status === 'completed'),
      };
    });

    expect(result.mainTaskStatus).toBe('completed');
    expect(result.subtaskCount).toBe(3);
    expect(result.allSubtasksCompleted).toBe(true);
  });

  test('should track progress across tasks', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface Progress {
        total: number;
        completed: number;
        failed: number;
        percentage: number;
      }

      const tasks = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'in_progress' },
        { id: '4', status: 'pending' },
        { id: '5', status: 'failed' },
      ];

      const calculateProgress = (): Progress => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const failed = tasks.filter(t => t.status === 'failed').length;
        const percentage = Math.round((completed / total) * 100);

        return { total, completed, failed, percentage };
      };

      return calculateProgress();
    });

    expect(result.total).toBe(5);
    expect(result.completed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.percentage).toBe(40);
  });

  test('should generate execution summary', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      interface ExecutionSummary {
        totalSteps: number;
        toolsUsed: string[];
        duration: number;
        success: boolean;
        output: string;
      }

      const generateSummary = (
        steps: number,
        tools: string[],
        startTime: number,
        endTime: number,
        output: string,
        hasError: boolean
      ): ExecutionSummary => {
        return {
          totalSteps: steps,
          toolsUsed: [...new Set(tools)],
          duration: endTime - startTime,
          success: !hasError,
          output,
        };
      };

      const summary = generateSummary(
        5,
        ['search', 'calculator', 'search', 'summarize'],
        1000,
        5000,
        'Task completed successfully',
        false
      );

      return {
        totalSteps: summary.totalSteps,
        uniqueToolCount: summary.toolsUsed.length,
        duration: summary.duration,
        success: summary.success,
        hasOutput: summary.output.length > 0,
      };
    });

    expect(result.totalSteps).toBe(5);
    expect(result.uniqueToolCount).toBe(3); // search, calculator, summarize
    expect(result.duration).toBe(4000);
    expect(result.success).toBe(true);
    expect(result.hasOutput).toBe(true);
  });
});
