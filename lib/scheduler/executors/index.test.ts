import type { ScheduledTask, TaskExecution } from '@/types/scheduler';
import { loggers } from '@/lib/logger';
import { executeWorkflowTask } from './index';

const mockRegisterTaskExecutor = jest.fn();
const mockExecutePluginTask = jest.fn();
const mockExecuteScript = jest.fn();
const mockRun = jest.fn();
const mockPersistExecution = jest.fn();
const mockGetById = jest.fn();
const mockDefinitionToVisual = jest.fn();

jest.mock('../task-scheduler', () => ({
  registerTaskExecutor: (...args: unknown[]) => mockRegisterTaskExecutor(...args),
}));

jest.mock('./plugin-executor', () => ({
  executePluginTask: (...args: unknown[]) => mockExecutePluginTask(...args),
}));

jest.mock('../script-executor', () => ({
  executeScript: (...args: unknown[]) => mockExecuteScript(...args),
}));

jest.mock('@/lib/workflow-editor/orchestrator', () => ({
  workflowOrchestrator: {
    run: (...args: unknown[]) => mockRun(...args),
    persistExecution: (...args: unknown[]) => mockPersistExecution(...args),
  },
}));

jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    getById: (...args: unknown[]) => mockGetById(...args),
  },
}));

jest.mock('@/lib/workflow-editor/converter', () => ({
  definitionToVisual: (...args: unknown[]) => mockDefinitionToVisual(...args),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

function createTask(payload: Record<string, unknown>): ScheduledTask {
  return {
    id: 'task-1',
    name: 'Workflow Task',
    type: 'workflow',
    trigger: { type: 'interval', intervalMs: 60000 },
    payload,
    config: {
      timeout: 300000,
      maxRetries: 3,
      retryDelay: 1000,
      runMissedOnStartup: false,
      allowConcurrent: false,
    },
    notification: {
      onStart: false,
      onComplete: false,
      onError: true,
    },
    status: 'active',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };
}

function createExecution(): TaskExecution {
  return {
    id: 'exec-1',
    taskId: 'task-1',
    taskName: 'Workflow Task',
    taskType: 'workflow',
    status: 'running',
    retryAttempt: 0,
    startedAt: new Date('2025-01-01T00:00:00.000Z'),
    logs: [],
  };
}

function createVisualWorkflow(id: string) {
  return {
    id,
    name: `Workflow ${id}`,
    settings: {},
    nodes: [],
    edges: [],
  } as unknown;
}

function createRuntimeResult(overrides?: Partial<Record<string, unknown>>) {
  return {
    executionId: 'wf-exec-1',
    workflowId: 'wf-1',
    runtime: 'browser',
    status: 'completed',
    input: { foo: 'bar' },
    output: { ok: true },
    nodeStates: {
      node1: { status: 'completed' },
      node2: { status: 'failed' },
    },
    triggerId: 'trigger-1',
    ...overrides,
  };
}

describe('executeWorkflowTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads workflow by workflowId and runs through orchestrator with trigger/options', async () => {
    const persistedWorkflow = createVisualWorkflow('wf-1');
    const result = createRuntimeResult();
    mockGetById.mockResolvedValue(persistedWorkflow);
    mockRun.mockResolvedValue(result);
    mockPersistExecution.mockResolvedValue(undefined);

    const task = createTask({
      workflowId: 'wf-1',
      input: { foo: 'bar' },
      options: {
        triggerId: 'schedule-trigger-1',
        isReplay: true,
      },
    });

    const execution = createExecution();
    const response = await executeWorkflowTask(task, execution);

    expect(mockGetById).toHaveBeenCalledWith('wf-1');
    expect(mockDefinitionToVisual).not.toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith({
      workflow: persistedWorkflow,
      input: { foo: 'bar' },
      triggerId: 'schedule-trigger-1',
      isReplay: true,
    });
    expect(mockPersistExecution).toHaveBeenCalledWith({ result });
    expect(response).toEqual({
      success: true,
      output: {
        workflowId: 'wf-1',
        executionId: 'wf-exec-1',
        runtime: 'browser',
        status: 'completed',
        completedSteps: 1,
        failedSteps: 1,
        totalSteps: 2,
        triggerId: 'trigger-1',
        output: { ok: true },
      },
      error: undefined,
    });
  });

  it('falls back to workflowDefinition when workflowId is missing', async () => {
    const workflowDefinition = { id: 'wf-def-primary' };
    const fallbackDefinition = { id: 'wf-def-fallback' };
    const visualFromDefinition = createVisualWorkflow('wf-def-primary');

    mockDefinitionToVisual.mockReturnValue(visualFromDefinition);
    mockRun.mockResolvedValue(createRuntimeResult({ workflowId: 'wf-def-primary' }));
    mockPersistExecution.mockResolvedValue(undefined);

    const task = createTask({
      workflowDefinition,
      definition: fallbackDefinition,
      input: {},
      triggerId: 'legacy-trigger-id',
    });

    const response = await executeWorkflowTask(task, createExecution());

    expect(mockDefinitionToVisual).toHaveBeenCalledWith(workflowDefinition);
    expect(mockRun).toHaveBeenCalledWith({
      workflow: visualFromDefinition,
      input: {},
      triggerId: 'legacy-trigger-id',
      isReplay: undefined,
    });
    expect(response.success).toBe(true);
  });

  it('falls back to definition conversion when workflowId is not found', async () => {
    const definition = { id: 'wf-def-1' };
    const visual = createVisualWorkflow('wf-def-1');

    mockGetById.mockResolvedValue(undefined);
    mockDefinitionToVisual.mockReturnValue(visual);
    mockRun.mockResolvedValue(createRuntimeResult({ workflowId: 'wf-def-1' }));
    mockPersistExecution.mockResolvedValue(undefined);

    const task = createTask({
      workflowId: 'missing-workflow',
      definition,
    });

    const response = await executeWorkflowTask(task, createExecution());

    expect(mockGetById).toHaveBeenCalledWith('missing-workflow');
    expect(mockDefinitionToVisual).toHaveBeenCalledWith(definition);
    expect(response.success).toBe(true);
  });

  it('does not fail execution when persistence fails', async () => {
    const persistedWorkflow = createVisualWorkflow('wf-1');
    mockGetById.mockResolvedValue(persistedWorkflow);
    mockRun.mockResolvedValue(createRuntimeResult());
    mockPersistExecution.mockRejectedValue(new Error('db down'));

    const response = await executeWorkflowTask(
      createTask({
        workflowId: 'wf-1',
      }),
      createExecution()
    );

    expect(response.success).toBe(true);
    expect(loggers.app.warn).toHaveBeenCalledWith(
      'Failed to persist scheduled workflow execution',
      expect.objectContaining({
        taskId: 'task-1',
      })
    );
  });

  it('returns failed result when workflow ends with non-completed status', async () => {
    const persistedWorkflow = createVisualWorkflow('wf-1');
    mockGetById.mockResolvedValue(persistedWorkflow);
    mockRun.mockResolvedValue(
      createRuntimeResult({
        status: 'failed',
        error: 'runtime failed',
        nodeStates: {
          node1: { status: 'failed' },
        },
      })
    );
    mockPersistExecution.mockResolvedValue(undefined);

    const response = await executeWorkflowTask(
      createTask({
        workflowId: 'wf-1',
      }),
      createExecution()
    );

    expect(response.success).toBe(false);
    expect(response.error).toBe('runtime failed');
    expect(response.output).toEqual(
      expect.objectContaining({
        failedSteps: 1,
        completedSteps: 0,
        totalSteps: 1,
        status: 'failed',
      })
    );
  });
});
