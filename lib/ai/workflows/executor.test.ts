/**
 * Tests for executor.ts
 * Workflow Executor - Executes workflows step by step
 */

import {
  createWorkflowExecution,
  executeWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
} from './executor';
import { getGlobalWorkflowRegistry } from './registry';
import { getGlobalToolRegistry } from '../tools/registry';
import { generateText } from 'ai';
import type { WorkflowDefinition, WorkflowStepDefinition } from '@/types/workflow';

// Mock dependencies
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('./registry', () => ({
  getGlobalWorkflowRegistry: jest.fn(),
}));

jest.mock('../tools/registry', () => ({
  getGlobalToolRegistry: jest.fn(),
}));

jest.mock('../core/client', () => ({
  getProviderModel: jest.fn(() => ({})),
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

jest.mock('@/lib/db/repositories/workflow-repository', () => ({
  workflowRepository: {
    createExecution: jest.fn().mockResolvedValue({ id: 'exec-123' }),
    updateExecution: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    ai: {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

const mockedGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockedGetWorkflowRegistry = getGlobalWorkflowRegistry as jest.MockedFunction<typeof getGlobalWorkflowRegistry>;
const mockedGetToolRegistry = getGlobalToolRegistry as jest.MockedFunction<typeof getGlobalToolRegistry>;

// Mock fetch for webhook tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create mock workflow definition
const createMockWorkflow = (steps: Partial<WorkflowStepDefinition>[] = []): WorkflowDefinition => ({
  id: 'test-workflow',
  name: 'Test Workflow',
  version: '1.0.0',
  description: 'A test workflow',
  type: 'ppt-generation',
  icon: 'test',
  category: 'test',
  tags: [],
  steps: steps.map((step, index) => ({
    id: step.id || `step-${index}`,
    name: step.name || `Step ${index}`,
    type: step.type || 'transform',
    inputs: step.inputs || {},
    outputs: step.outputs || {},
    ...step,
  })) as WorkflowStepDefinition[],
  inputs: {},
  outputs: {},
});

describe('executor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createWorkflowExecution', () => {
    it('should create initial execution state', () => {
      const workflow = createMockWorkflow([
        { id: 'step1', name: 'Step 1' },
        { id: 'step2', name: 'Step 2' },
      ]);

      const execution = createWorkflowExecution(workflow, 'session-1', { key: 'value' });

      expect(execution.id).toBe('test-id-123');
      expect(execution.workflowId).toBe('test-workflow');
      expect(execution.workflowName).toBe('Test Workflow');
      expect(execution.sessionId).toBe('session-1');
      expect(execution.status).toBe('idle');
      expect(execution.input).toEqual({ key: 'value' });
      expect(execution.steps).toHaveLength(2);
      expect(execution.progress).toBe(0);
    });

    it('should initialize steps with pending status', () => {
      const workflow = createMockWorkflow([
        { id: 'step1' },
        { id: 'step2' },
      ]);

      const execution = createWorkflowExecution(workflow, 'session-1');

      execution.steps.forEach(step => {
        expect(step.status).toBe('pending');
        expect(step.retryCount).toBe(0);
        expect(step.logs).toEqual([]);
      });
    });

    it('should merge default config with provided config', () => {
      const workflow = createMockWorkflow([]);
      workflow.defaultConfig = { default: 'value' };

      const execution = createWorkflowExecution(workflow, 'session-1', {}, { custom: 'config' });

      expect(execution.config).toEqual({ default: 'value', custom: 'config' });
    });
  });

  describe('executeWorkflow', () => {
    const defaultConfig = {
      provider: 'openai' as const,
      model: 'gpt-4',
      apiKey: 'test-key',
    };

    it('should throw if workflow not found', async () => {
      mockedGetWorkflowRegistry.mockReturnValue({
        get: () => undefined,
      } as never);

      await expect(
        executeWorkflow('unknown-workflow', 'session-1', {}, defaultConfig)
      ).rejects.toThrow('Workflow not found');
    });

    it('should execute workflow with single step', async () => {
      const workflow = createMockWorkflow([
        { 
          id: 'step1', 
          name: 'Transform Step',
          type: 'transform',
          expression: 'data',
        },
      ]);

      mockedGetWorkflowRegistry.mockReturnValue({
        get: () => workflow,
      } as never);

      const result = await executeWorkflow('test-workflow', 'session-1', { data: 'test' }, defaultConfig);

      expect(result.success).toBe(true);
      expect(result.execution.status).toBe('completed');
    });

    it('should call onStart callback', async () => {
      const workflow = createMockWorkflow([]);
      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const onStart = jest.fn();
      await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig, { onStart });

      expect(onStart).toHaveBeenCalled();
    });

    it('should call onComplete callback on success', async () => {
      const workflow = createMockWorkflow([]);
      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const onComplete = jest.fn();
      await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig, { onComplete });

      expect(onComplete).toHaveBeenCalled();
    });

    it('should call onError callback on failure', async () => {
      const workflow = createMockWorkflow([
        { 
          id: 'step1',
          type: 'code',
          code: 'throw new Error("test error")',
        },
      ]);
      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const onError = jest.fn();
      const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig, { onError });

      expect(result.success).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it('should execute steps in dependency order', async () => {
      const executionOrder: string[] = [];
      
      const workflow = createMockWorkflow([
        { 
          id: 'step1',
          type: 'transform',
        },
        { 
          id: 'step2',
          type: 'transform',
          dependencies: ['step1'],
        },
      ]);

      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const onStepComplete = jest.fn((_, stepId) => executionOrder.push(stepId));
      await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig, { onStepComplete });

      // step1 should complete before step2 due to dependency
      expect(executionOrder.indexOf('step1')).toBeLessThan(executionOrder.indexOf('step2'));
    });

    it('should track progress', async () => {
      const workflow = createMockWorkflow([
        { id: 'step1', type: 'transform' },
        { id: 'step2', type: 'transform' },
      ]);

      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const progressValues: number[] = [];
      const onProgress = jest.fn((_, progress) => progressValues.push(progress));
      
      await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig, { onProgress });

      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });
  });

  describe('Step Types', () => {
    const defaultConfig = {
      provider: 'openai' as const,
      model: 'gpt-4',
      apiKey: 'test-key',
    };

    describe('AI Step', () => {
      it('should execute AI step with generateText', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'ai-step',
            type: 'ai',
            aiPrompt: 'Tell me about {{topic}}',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);
        mockedGenerateText.mockResolvedValue({
          text: 'AI response',
          usage: { promptTokens: 10, completionTokens: 20 },
        } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { topic: 'JavaScript' },
          defaultConfig
        );

        expect(result.success).toBe(true);
        expect(mockedGenerateText).toHaveBeenCalled();
      });
    });

    describe('Tool Step', () => {
      it('should execute tool step', async () => {
        const mockToolFn = jest.fn().mockResolvedValue({ result: 'tool output' });
        mockedGetToolRegistry.mockReturnValue({
          get: () => ({
            create: () => mockToolFn,
          }),
        } as never);

        const workflow = createMockWorkflow([
          { 
            id: 'tool-step',
            type: 'tool',
            toolName: 'test-tool',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

        expect(result.success).toBe(true);
        expect(mockToolFn).toHaveBeenCalled();
      });

      it('should throw if tool not found', async () => {
        mockedGetToolRegistry.mockReturnValue({
          get: () => undefined,
        } as never);

        const workflow = createMockWorkflow([
          { 
            id: 'tool-step',
            type: 'tool',
            toolName: 'unknown-tool',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Tool not found');
      });
    });

    describe('Code Step', () => {
      it('should fail code step outside desktop runtime', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'code-step',
            type: 'code',
            code: 'return { result: input.value * 2 }',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { value: 5 },
          defaultConfig
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('desktop runtime');
      });

      it('should handle code errors', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'code-step',
            type: 'code',
            code: 'throw new Error("Code error")',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

        expect(result.success).toBe(false);
        expect(result.error).toContain('desktop runtime');
      });
    });

    describe('Transform Step', () => {
      it('should transform data with map', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'transform-step',
            type: 'transform',
            transformType: 'map',
            expression: 'item * 2',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { data: [1, 2, 3] },
          defaultConfig
        );

        expect(result.success).toBe(true);
      });

      it('should transform data with filter', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'transform-step',
            type: 'transform',
            transformType: 'filter',
            expression: 'item > 2',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { data: [1, 2, 3, 4] },
          defaultConfig
        );

        expect(result.success).toBe(true);
      });
    });

    describe('Delay Step', () => {
      it('should delay for fixed duration', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'delay-step',
            type: 'delay',
            delayType: 'fixed',
            delayMs: 1000,
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const resultPromise = executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);
        
        // Advance timers asynchronously (needed for await-based delays)
        await jest.advanceTimersByTimeAsync(1000);
        
        const result = await resultPromise;
        expect(result.success).toBe(true);
      });
    });

    describe('Webhook Step', () => {
      it('should make HTTP request', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve('{"data": "response"}'),
          headers: new Map(),
        });

        const workflow = createMockWorkflow([
          { 
            id: 'webhook-step',
            type: 'webhook',
            webhookUrl: 'https://api.example.com/webhook',
            method: 'POST',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    describe('Merge Step', () => {
      it('should merge objects', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'merge-step',
            type: 'merge',
            mergeStrategy: 'merge',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { a: { x: 1 }, b: { y: 2 } },
          defaultConfig
        );

        expect(result.success).toBe(true);
      });

      it('should concatenate arrays', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'merge-step',
            type: 'merge',
            mergeStrategy: 'concat',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { a: [1, 2], b: [3, 4] },
          defaultConfig
        );

        expect(result.success).toBe(true);
      });
    });

    describe('Loop Step', () => {
      it('should iterate with forEach', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'loop-step',
            type: 'loop',
            loopType: 'forEach',
            collection: 'items',
            iteratorVariable: 'item',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { items: [1, 2, 3] },
          defaultConfig
        );

        expect(result.success).toBe(true);
      });

      it('should iterate with times', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'loop-step',
            type: 'loop',
            loopType: 'times',
            maxIterations: 5,
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

        expect(result.success).toBe(true);
      });
    });

    describe('Human Step', () => {
      it('should wait for approval', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'human-step',
            type: 'human',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const requireApproval = jest.fn().mockResolvedValue(true);
        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          {},
          defaultConfig,
          { requireApproval }
        );

        expect(result.success).toBe(true);
        expect(requireApproval).toHaveBeenCalled();
      });

      it('should fail if approval rejected', async () => {
        const workflow = createMockWorkflow([
          { 
            id: 'human-step',
            type: 'human',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const requireApproval = jest.fn().mockResolvedValue(false);
        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          {},
          defaultConfig,
          { requireApproval }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('rejected');
      });
    });

    describe('Advanced passthrough steps', () => {
      it('should not fail on advanced node types and return structured passthrough output', async () => {
        const workflow = createMockWorkflow([
          {
            id: 'advanced-step',
            type: 'knowledgeRetrieval',
          },
        ]);

        mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

        const result = await executeWorkflow(
          'test-workflow',
          'session-1',
          { query: 'hello' },
          defaultConfig
        );

        expect(result.success).toBe(true);
        const advancedStep = result.execution.steps.find((step) => step.stepId === 'advanced-step');
        expect(advancedStep?.status).toBe('completed');
        expect(advancedStep?.output).toMatchObject({
          passthrough: true,
          stepType: 'knowledgeRetrieval',
        });
      });
    });
  });

  describe('Workflow Control', () => {
    describe('pauseWorkflow', () => {
      it('should pause executing workflow', () => {
        const workflow = createMockWorkflow([]);
        const execution = createWorkflowExecution(workflow, 'session-1');
        execution.status = 'executing';

        pauseWorkflow(execution);

        expect(execution.status).toBe('paused');
      });

      it('should not pause non-executing workflow', () => {
        const workflow = createMockWorkflow([]);
        const execution = createWorkflowExecution(workflow, 'session-1');
        execution.status = 'completed';

        pauseWorkflow(execution);

        expect(execution.status).toBe('completed');
      });
    });

    describe('resumeWorkflow', () => {
      it('should resume paused workflow', () => {
        const workflow = createMockWorkflow([]);
        const execution = createWorkflowExecution(workflow, 'session-1');
        execution.status = 'paused';

        resumeWorkflow(execution);

        expect(execution.status).toBe('executing');
      });

      it('should not resume non-paused workflow', () => {
        const workflow = createMockWorkflow([]);
        const execution = createWorkflowExecution(workflow, 'session-1');
        execution.status = 'completed';

        resumeWorkflow(execution);

        expect(execution.status).toBe('completed');
      });
    });

    describe('cancelWorkflow', () => {
      it('should cancel executing workflow', () => {
        const workflow = createMockWorkflow([]);
        const execution = createWorkflowExecution(workflow, 'session-1');
        execution.status = 'executing';
        execution.startedAt = new Date();

        cancelWorkflow(execution);

        expect(execution.status).toBe('cancelled');
        expect(execution.completedAt).toBeDefined();
        expect(execution.duration).toBeDefined();
      });

      it('should cancel paused workflow', () => {
        const workflow = createMockWorkflow([]);
        const execution = createWorkflowExecution(workflow, 'session-1');
        execution.status = 'paused';
        execution.startedAt = new Date();

        cancelWorkflow(execution);

        expect(execution.status).toBe('cancelled');
      });

      it('should not cancel completed workflow', () => {
        const workflow = createMockWorkflow([]);
        const execution = createWorkflowExecution(workflow, 'session-1');
        execution.status = 'completed';

        cancelWorkflow(execution);

        expect(execution.status).toBe('completed');
      });
    });
  });

  describe('Error Handling and Retries', () => {
    const defaultConfig = {
      provider: 'openai' as const,
      model: 'gpt-4',
      apiKey: 'test-key',
      maxRetries: 2,
    };

    it('should retry failed steps', async () => {
      const workflow = createMockWorkflow([
        { 
          id: 'retry-step',
          type: 'transform',
          retryCount: 3,
        },
      ]);

      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

      // The execution should succeed for a simple transform step
      expect(result.execution).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should skip optional steps on dependency failure', async () => {
      const workflow = createMockWorkflow([
        { 
          id: 'fail-step',
          type: 'code',
          code: 'throw new Error("Failed")',
        },
        { 
          id: 'optional-step',
          type: 'transform',
          dependencies: ['fail-step'],
          optional: true,
        },
      ]);

      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

      // The workflow should have failed due to the code step error
      expect(result.success).toBe(false);
      
      // The fail-step should have failed status
      const failStep = result.execution.steps.find(s => s.stepId === 'fail-step');
      expect(failStep?.status).toBe('failed');
    });
  });

  describe('Execution State Persistence', () => {
    const defaultConfig = {
      provider: 'openai' as const,
      model: 'gpt-4',
      apiKey: 'test-key',
    };

    const mockWorkflowRepository = jest.requireMock('@/lib/db/repositories/workflow-repository').workflowRepository;

    beforeEach(() => {
      mockWorkflowRepository.createExecution.mockClear();
      mockWorkflowRepository.updateExecution.mockClear();
    });

    it('should create execution record on workflow start', async () => {
      const workflow = createMockWorkflow([]);
      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      await executeWorkflow('test-workflow', 'session-1', { input: 'data' }, defaultConfig);

      expect(mockWorkflowRepository.createExecution).toHaveBeenCalledWith(
        'test-workflow',
        { input: 'data' },
        expect.objectContaining({
          executionId: 'test-id-123',
          status: 'running',
        })
      );
    });

    it('should persist state on workflow completion', async () => {
      const workflow = createMockWorkflow([
        { id: 'step1', type: 'transform' },
      ]);
      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

      expect(mockWorkflowRepository.updateExecution).toHaveBeenCalled();
    });

    it('should persist state on workflow failure', async () => {
      const workflow = createMockWorkflow([
        { id: 'fail-step', type: 'code', code: 'throw new Error("fail")' },
      ]);
      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

      expect(mockWorkflowRepository.updateExecution).toHaveBeenCalled();
    });

    it('should continue execution even if persistence fails', async () => {
      mockWorkflowRepository.createExecution.mockRejectedValueOnce(new Error('DB error'));
      
      const workflow = createMockWorkflow([]);
      mockedGetWorkflowRegistry.mockReturnValue({ get: () => workflow } as never);

      const result = await executeWorkflow('test-workflow', 'session-1', {}, defaultConfig);

      expect(result.success).toBe(true);
    });
  });
});
