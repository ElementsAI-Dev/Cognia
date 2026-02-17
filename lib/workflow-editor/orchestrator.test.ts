import type { VisualWorkflow } from '@/types/workflow/workflow-editor';
import type { WorkflowRuntimeAdapter, WorkflowRuntimeExecutionResult } from './runtime-adapter';

const mockGetExecution = jest.fn();
const mockCreateExecution = jest.fn();
const mockUpdateExecution = jest.fn();

jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    getExecution: (...args: unknown[]) => mockGetExecution(...args),
    createExecution: (...args: unknown[]) => mockCreateExecution(...args),
    updateExecution: (...args: unknown[]) => mockUpdateExecution(...args),
  },
}));

jest.mock('./converter', () => ({
  visualToDefinition: jest.fn((workflow: { id: string; name: string }) => ({
    id: workflow.id,
    name: workflow.name,
    description: '',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'test',
    tags: [],
    steps: [],
    inputs: {},
    outputs: {},
  })),
}));

import { WorkflowOrchestrator } from './orchestrator';

function createWorkflow(): VisualWorkflow {
  const now = new Date();
  return {
    id: 'wf-orchestrator',
    name: 'Orchestrator Workflow',
    description: '',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'test',
    tags: [],
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    inputs: {},
    outputs: {},
    variables: {},
    settings: {
      autoSave: true,
      autoLayout: false,
      showMinimap: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,
      retryOnFailure: true,
      maxRetries: 3,
      logLevel: 'info',
    },
    createdAt: now,
    updatedAt: now,
  } as VisualWorkflow;
}

function createResult(
  status: WorkflowRuntimeExecutionResult['status']
): WorkflowRuntimeExecutionResult {
  return {
    executionId: 'exec-1',
    workflowId: 'wf-orchestrator',
    runtime: 'browser',
    status,
    input: { user: 'alice' },
    output: status === 'completed' ? { ok: true } : undefined,
    nodeStates: {},
    startedAt: new Date('2026-01-01T00:00:00Z'),
    completedAt: status === 'completed' ? new Date('2026-01-01T00:00:01Z') : undefined,
  };
}

function createAdapter(
  overrides?: Partial<WorkflowRuntimeAdapter>
): WorkflowRuntimeAdapter {
  return {
    runtime: 'browser',
    execute: jest.fn().mockResolvedValue(createResult('completed')),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    getExecution: jest.fn().mockResolvedValue(null),
    listExecutions: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('WorkflowOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses runtime adapter as single run entrypoint', async () => {
    const workflow = createWorkflow();
    const adapter = createAdapter();
    const orchestrator = new WorkflowOrchestrator(adapter);

    const result = await orchestrator.run({ workflow, input: { value: 42 } });

    expect(adapter.execute).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('completed');
    expect(result.executionId).toBe('exec-1');
  });

  it('keeps running executions in active cache and serves them from getExecution', async () => {
    const workflow = createWorkflow();
    const runningResult = createResult('running');
    const adapter = createAdapter({
      execute: jest.fn().mockResolvedValue(runningResult),
      getExecution: jest.fn().mockResolvedValue(null),
    });
    const orchestrator = new WorkflowOrchestrator(adapter);

    await orchestrator.run({ workflow, input: {} });
    const cached = await orchestrator.getExecution('exec-1');

    expect(cached?.status).toBe('running');
    expect(adapter.getExecution).not.toHaveBeenCalled();
  });

  it('persists execution with consistent external executionId', async () => {
    const adapter = createAdapter();
    const orchestrator = new WorkflowOrchestrator(adapter);
    const result = createResult('completed');

    mockGetExecution.mockResolvedValueOnce(null);

    await orchestrator.persistExecution({
      result,
      logs: [
        {
          timestamp: new Date('2026-01-01T00:00:01Z'),
          level: 'info',
          message: 'done',
        },
      ],
    });

    expect(mockCreateExecution).toHaveBeenCalledWith(
      'wf-orchestrator',
      { user: 'alice' },
      expect.objectContaining({
        executionId: 'exec-1',
        status: 'completed',
      })
    );
    expect(mockUpdateExecution).toHaveBeenCalledWith(
      'exec-1',
      expect.objectContaining({
        status: 'completed',
        output: { ok: true },
      })
    );
  });

  it('skips createExecution when record already exists', async () => {
    const adapter = createAdapter();
    const orchestrator = new WorkflowOrchestrator(adapter);
    const result = createResult('failed');

    mockGetExecution.mockResolvedValueOnce({ id: 'exec-1' });

    await orchestrator.persistExecution({ result, logs: [] });

    expect(mockCreateExecution).not.toHaveBeenCalled();
    expect(mockUpdateExecution).toHaveBeenCalledWith(
      'exec-1',
      expect.objectContaining({
        status: 'failed',
      })
    );
  });
});
