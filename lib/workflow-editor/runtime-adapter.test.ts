import type { VisualWorkflow } from '@/types/workflow/workflow-editor';
import type { WorkflowDefinition } from '@/types/workflow';

const mockExecuteVisualWorkflow = jest.fn();
const mockPauseVisualWorkflow = jest.fn();
const mockResumeVisualWorkflow = jest.fn();
const mockCancelVisualWorkflow = jest.fn();

const mockWorkflowRunDefinition = jest.fn();
const mockWorkflowCancelExecution = jest.fn();
const mockWorkflowPauseExecution = jest.fn();
const mockWorkflowResumeExecution = jest.fn();
const mockWorkflowGetExecution = jest.fn();
const mockWorkflowListExecutions = jest.fn();
const mockOnWorkflowRuntimeEvent = jest.fn();

const mockIsTauri = jest.fn(() => false);
let nativeEventListener: ((event: Record<string, unknown>) => void) | null = null;

jest.mock('@/lib/workflow-editor/executor-integration', () => ({
  executeVisualWorkflow: (...args: unknown[]) => mockExecuteVisualWorkflow(...args),
  pauseVisualWorkflow: (...args: unknown[]) => mockPauseVisualWorkflow(...args),
  resumeVisualWorkflow: (...args: unknown[]) => mockResumeVisualWorkflow(...args),
  cancelVisualWorkflow: (...args: unknown[]) => mockCancelVisualWorkflow(...args),
}));

jest.mock('@/lib/native/workflow-runtime', () => ({
  workflowRunDefinition: (...args: unknown[]) => mockWorkflowRunDefinition(...args),
  workflowCancelExecution: (...args: unknown[]) => mockWorkflowCancelExecution(...args),
  workflowPauseExecution: (...args: unknown[]) => mockWorkflowPauseExecution(...args),
  workflowResumeExecution: (...args: unknown[]) => mockWorkflowResumeExecution(...args),
  workflowGetExecution: (...args: unknown[]) => mockWorkflowGetExecution(...args),
  workflowListExecutions: (...args: unknown[]) => mockWorkflowListExecutions(...args),
  onWorkflowRuntimeEvent: (...args: unknown[]) => mockOnWorkflowRuntimeEvent(...args),
}));

jest.mock('@/stores/settings', () => ({
  useSettingsStore: {
    getState: () => ({
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-key',
          defaultModel: 'gpt-4o-mini',
        },
      },
    }),
  },
}));

jest.mock('@/lib/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    app: {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

import {
  BrowserRuntimeAdapter,
  TauriRuntimeAdapter,
  createWorkflowRuntimeAdapter,
} from './runtime-adapter';
import { loggers } from '@/lib/logger';

function createWorkflow(): VisualWorkflow {
  const now = new Date();
  return {
    id: 'wf-runtime',
    name: 'Runtime Workflow',
    description: '',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'test',
    tags: [],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 0, y: 0 },
        data: {
          label: 'Start',
          nodeType: 'start',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowInputs: {},
        },
      },
      {
        id: 'step-1',
        type: 'transform',
        position: { x: 200, y: 0 },
        data: {
          label: 'Transform',
          nodeType: 'transform',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          expression: '1',
          inputs: {},
          outputs: {},
        },
      },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'step-1', type: 'default' }],
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

function createDefinition(workflowId: string, stepType: string = 'transform'): WorkflowDefinition {
  return {
    id: workflowId,
    name: 'Runtime Workflow Definition',
    description: '',
    type: 'custom',
    version: '1.0.0',
    icon: 'Workflow',
    category: 'test',
    tags: [],
    steps: [
      {
        id: 'step-1',
        name: 'Step',
        description: '',
        type: stepType as WorkflowDefinition['steps'][number]['type'],
        inputs: {},
        outputs: {},
      },
    ],
    inputs: {},
    outputs: {},
  };
}

describe('createWorkflowRuntimeAdapter', () => {
  it('returns browser adapter on web', () => {
    mockIsTauri.mockReturnValue(false);
    const adapter = createWorkflowRuntimeAdapter();
    expect(adapter.runtime).toBe('browser');
  });

  it('returns tauri adapter on desktop', () => {
    mockIsTauri.mockReturnValue(true);
    const adapter = createWorkflowRuntimeAdapter();
    expect(adapter.runtime).toBe('tauri');
  });
});

describe('BrowserRuntimeAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps browser execution and emits progress/step events', async () => {
    const workflow = createWorkflow();
    const definition = createDefinition(workflow.id);
    const events: string[] = [];

    mockExecuteVisualWorkflow.mockImplementationOnce(
      async (
        _workflow: unknown,
        _input: unknown,
        _config: unknown,
        callbacks?: {
          onStart?: (execution: { id: string }) => void;
          onProgress?: (execution: unknown, progress: number) => void;
          onStepStart?: (execution: unknown, stepId: string) => void;
          onStepComplete?: (execution: unknown, stepId: string, output: Record<string, unknown>) => void;
        }
      ) => {
        callbacks?.onStart?.({ id: 'exec-browser-1' });
        callbacks?.onProgress?.({}, 0.5);
        callbacks?.onStepStart?.({}, 'step-1');
        callbacks?.onStepComplete?.({}, 'step-1', { text: 'ok' });

        return {
          execution: {
            id: 'exec-browser-1',
            status: 'completed',
            output: { text: 'ok' },
            error: undefined,
            completedAt: new Date(),
            steps: [
              {
                stepId: 'step-1',
                status: 'waiting_approval',
                input: { prompt: 'hello' },
                output: { text: 'ok' },
                retryCount: 1,
              },
            ],
          },
          success: true,
          output: { text: 'ok' },
        };
      }
    );

    const adapter = new BrowserRuntimeAdapter();
    const result = await adapter.execute({
      workflow,
      definition,
      input: { value: 1 },
      onEvent: (event) => events.push(event.type),
    });

    expect(result.executionId).toBe('exec-browser-1');
    expect(result.runtime).toBe('browser');
    expect(result.status).toBe('completed');
    expect(result.nodeStates['step-1']?.status).toBe('waiting');
    expect(events).toEqual(
      expect.arrayContaining([
        'execution_started',
        'execution_progress',
        'step_started',
        'step_completed',
        'execution_completed',
      ])
    );
  });
});

describe('TauriRuntimeAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nativeEventListener = null;
    mockWorkflowGetExecution.mockResolvedValue(null);
    mockOnWorkflowRuntimeEvent.mockImplementation(async (callback: (event: Record<string, unknown>) => void) => {
      nativeEventListener = callback;
      return () => {
        nativeEventListener = null;
      };
    });
  });

  it('uses realtime native events with requestId filtering', async () => {
    const workflow = createWorkflow();
    const definition = createDefinition(workflow.id);
    const events: string[] = [];

    mockWorkflowRunDefinition.mockImplementationOnce(async (request: { options?: { requestId?: string } }) => {
      const requestId = request.options?.requestId || '';
      nativeEventListener?.({
        type: 'step_started',
        requestId: 'other-request',
        executionId: 'exec-tauri-1',
        workflowId: workflow.id,
        stepId: 'ignored-step',
      });
      nativeEventListener?.({
        type: 'execution_started',
        requestId,
        executionId: 'exec-tauri-1',
        workflowId: workflow.id,
      });
      nativeEventListener?.({
        type: 'step_started',
        requestId,
        executionId: 'exec-tauri-1',
        workflowId: workflow.id,
        stepId: 'step-1',
      });
      nativeEventListener?.({
        type: 'step_completed',
        requestId,
        executionId: 'exec-tauri-1',
        workflowId: workflow.id,
        stepId: 'step-1',
        data: { ok: true },
      });
      nativeEventListener?.({
        type: 'execution_completed',
        requestId,
        executionId: 'exec-tauri-1',
        workflowId: workflow.id,
      });

      return {
        executionId: 'exec-tauri-1',
        status: 'completed',
        output: { ok: true },
        stepStates: [
          {
            stepId: 'step-1',
            status: 'completed',
            output: { ok: true },
            retryCount: 0,
          },
        ],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    });

    const adapter = new TauriRuntimeAdapter();
    const result = await adapter.execute({
      workflow,
      definition,
      input: {},
      onEvent: (event) => events.push(event.type),
    });

    expect(result.runtime).toBe('tauri');
    expect(result.executionId).toBe('exec-tauri-1');
    expect(result.nodeStates['step-1']?.status).toBe('completed');
    expect(result.nodeStates['ignored-step']).toBeUndefined();
    expect(events.filter((event) => event === 'step_started')).toHaveLength(1);
  });

  it('serializes codeSandbox in tauri runtime request', async () => {
    const workflow = createWorkflow();
    const definition = createDefinition(workflow.id, 'code');
    definition.steps[0] = {
      ...definition.steps[0],
      id: 'code-1',
      type: 'code',
      language: 'python',
      code: 'print("hello")',
      codeSandbox: {
        runtime: 'docker',
        timeoutMs: 30_000,
        memoryLimitMb: 512,
        networkEnabled: false,
        env: { KEY: 'value' },
        args: ['--flag'],
        files: { 'data/input.txt': 'ok' },
      },
    };

    mockWorkflowRunDefinition.mockResolvedValueOnce({
      executionId: 'exec-tauri-code-1',
      status: 'completed',
      output: { ok: true },
      stepStates: [],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    const adapter = new TauriRuntimeAdapter();
    await adapter.execute({
      workflow,
      definition,
      input: {},
    });

    expect(mockWorkflowRunDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        definition: expect.objectContaining({
          steps: expect.arrayContaining([
            expect.objectContaining({
              id: 'code-1',
              codeSandbox: expect.objectContaining({
                runtime: 'docker',
                timeoutMs: 30_000,
              }),
            }),
          ]),
        }),
      })
    );
  });

  it('deduplicates step transitions from events and polling snapshots', async () => {
    jest.useFakeTimers();

    const workflow = createWorkflow();
    const definition = createDefinition(workflow.id);
    const events: string[] = [];

    mockWorkflowGetExecution.mockResolvedValue({
      executionId: 'exec-tauri-poll-1',
      workflowId: workflow.id,
      status: 'running',
      stepStates: [
        {
          stepId: 'step-1',
          status: 'running',
          retryCount: 0,
        },
      ],
    });

    mockWorkflowRunDefinition.mockImplementationOnce(
      async (request: { options?: { requestId?: string } }) =>
        new Promise((resolve) => {
          const requestId = request.options?.requestId || '';
          nativeEventListener?.({
            type: 'execution_started',
            requestId,
            executionId: 'exec-tauri-poll-1',
            workflowId: workflow.id,
          });
          nativeEventListener?.({
            type: 'step_started',
            requestId,
            executionId: 'exec-tauri-poll-1',
            workflowId: workflow.id,
            stepId: 'step-1',
          });

          setTimeout(() => {
            nativeEventListener?.({
              type: 'step_completed',
              requestId,
              executionId: 'exec-tauri-poll-1',
              workflowId: workflow.id,
              stepId: 'step-1',
              data: { ok: true },
            });
            resolve({
              executionId: 'exec-tauri-poll-1',
              status: 'completed',
              output: { ok: true },
              stepStates: [
                {
                  stepId: 'step-1',
                  status: 'completed',
                  output: { ok: true },
                  retryCount: 0,
                },
              ],
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            });
          }, 700);
        })
    );

    const adapter = new TauriRuntimeAdapter();
    const executionPromise = adapter.execute({
      workflow,
      definition,
      input: {},
      onEvent: (event) => events.push(event.type),
    });

    await jest.advanceTimersByTimeAsync(1200);
    const result = await executionPromise;

    expect(result.status).toBe('completed');
    expect(events.filter((event) => event === 'step_started')).toHaveLength(1);
    expect(events.filter((event) => event === 'step_completed')).toHaveLength(1);

    jest.useRealTimers();
  });

  it('falls back to browser runtime for unsupported node types', async () => {
    const workflow = createWorkflow();
    const definition = createDefinition(workflow.id, 'ai');
    const events: string[] = [];

    mockExecuteVisualWorkflow.mockResolvedValueOnce({
      execution: {
        id: 'exec-browser-fallback-1',
        status: 'completed',
        output: { ok: true },
        completedAt: new Date(),
        steps: [],
      },
      success: true,
      output: { ok: true },
    });

    const adapter = new TauriRuntimeAdapter();
    const result = await adapter.execute({
      workflow,
      definition,
      input: {},
      onEvent: (event) => events.push(event.type),
    });

    expect(mockWorkflowRunDefinition).not.toHaveBeenCalled();
    expect(mockExecuteVisualWorkflow).toHaveBeenCalledTimes(1);
    expect(result.runtime).toBe('browser');
    expect(events).toEqual(expect.arrayContaining(['execution_log', 'execution_completed']));
  });

  it('calls native pause/resume commands', async () => {
    mockWorkflowPauseExecution.mockResolvedValue(true);
    mockWorkflowResumeExecution.mockResolvedValue(true);

    const adapter = new TauriRuntimeAdapter();
    await adapter.pause('exec-tauri-pause-1');
    await adapter.resume('exec-tauri-pause-1');

    expect(mockWorkflowPauseExecution).toHaveBeenCalledWith('exec-tauri-pause-1');
    expect(mockWorkflowResumeExecution).toHaveBeenCalledWith('exec-tauri-pause-1');
    expect(loggers.app.warn).not.toHaveBeenCalled();
  });

  it('warns when native pause/resume request is not accepted', async () => {
    mockWorkflowPauseExecution.mockResolvedValue(false);
    mockWorkflowResumeExecution.mockResolvedValue(false);

    const adapter = new TauriRuntimeAdapter();
    await adapter.pause('exec-tauri-pause-2');
    await adapter.resume('exec-tauri-pause-2');

    expect(loggers.app.warn).toHaveBeenCalledWith(
      '[WorkflowRuntime] pause request ignored by tauri runtime',
      { executionId: 'exec-tauri-pause-2' }
    );
    expect(loggers.app.warn).toHaveBeenCalledWith(
      '[WorkflowRuntime] resume request ignored by tauri runtime',
      { executionId: 'exec-tauri-pause-2' }
    );
  });
});
