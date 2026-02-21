import type { VisualWorkflow, WorkflowTrigger } from '@/types/workflow/workflow-editor';

const mockInitSchedulerSystem = jest.fn();
const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockPauseTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockIsTauri = jest.fn(() => false);
const mockCreateSystemTask = jest.fn();
const mockUpdateSystemTask = jest.fn();
const mockDeleteSystemTask = jest.fn();

jest.mock('@/lib/scheduler', () => ({
  initSchedulerSystem: () => mockInitSchedulerSystem(),
  getTaskScheduler: () => ({
    createTask: mockCreateTask,
    updateTask: mockUpdateTask,
    pauseTask: mockPauseTask,
    deleteTask: mockDeleteTask,
  }),
}));

jest.mock('@/lib/workflow-editor/converter', () => ({
  visualToDefinition: jest.fn(() => ({
    id: 'wf-definition',
    name: 'Definition',
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

jest.mock('@/lib/native/system-scheduler', () => ({
  createCronTrigger: jest.fn((expression: string, timezone?: string) => ({
    type: 'cron',
    expression,
    timezone,
  })),
  createScriptAction: jest.fn((language: string, code: string, options?: Record<string, unknown>) => ({
    type: 'execute_script',
    language,
    code,
    ...options,
  })),
  createSystemTask: (...args: unknown[]) => mockCreateSystemTask(...args),
  updateSystemTask: (...args: unknown[]) => mockUpdateSystemTask(...args),
  deleteSystemTask: (...args: unknown[]) => mockDeleteSystemTask(...args),
}));

jest.mock('@/lib/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

import {
  WorkflowTriggerSyncService,
  getTriggerSyncBadgeVariant,
} from './trigger-sync-service';

function createWorkflow(): VisualWorkflow {
  const now = new Date();
  return {
    id: 'workflow-1',
    name: 'Workflow One',
    description: 'test',
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
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 0 },
        data: {
          label: 'End',
          nodeType: 'end',
          executionStatus: 'idle',
          isConfigured: true,
          hasError: false,
          workflowOutputs: {},
          outputMapping: {},
        },
      },
    ],
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
      maxExecutionTime: 120000,
      triggers: [],
    },
    createdAt: now,
    updatedAt: now,
  } as VisualWorkflow;
}

function createTrigger(partial?: Partial<WorkflowTrigger>): WorkflowTrigger {
  return {
    id: 'trigger-1',
    name: 'Morning Trigger',
    type: 'schedule',
    enabled: true,
    config: {
      cronExpression: '0 9 * * *',
      timezone: 'UTC',
      syncStatus: 'idle',
    },
    ...partial,
  };
}

describe('WorkflowTriggerSyncService', () => {
  let service: WorkflowTriggerSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowTriggerSyncService();
  });

  it('keeps manual trigger unscheduled with backend=none', async () => {
    const workflow = createWorkflow();
    const trigger = createTrigger({ type: 'manual' });

    const result = await service.syncTrigger(workflow, trigger);

    expect(result.config.backend).toBe('none');
    expect(result.config.syncStatus).toBe('idle');
    expect(result.config.bindingTaskId).toBeUndefined();
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockCreateSystemTask).not.toHaveBeenCalled();
  });

  it('falls back to app scheduler on web when backend is system', async () => {
    mockIsTauri.mockReturnValue(false);
    mockCreateTask.mockResolvedValue({ id: 'app-task-1' });

    const workflow = createWorkflow();
    const trigger = createTrigger({
      config: {
        cronExpression: '*/15 * * * *',
        timezone: 'UTC',
        backend: 'system',
      },
    });

    const result = await service.syncTrigger(workflow, trigger);

    expect(mockInitSchedulerSystem).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(result.config.backend).toBe('app');
    expect(result.config.bindingTaskId).toBe('app-task-1');
    expect(result.config.runtimeSource).toBe('app-scheduler');
    expect(result.config.syncStatus).toBe('synced');
  });

  it('uses system scheduler on tauri desktop', async () => {
    mockIsTauri.mockReturnValue(true);
    mockCreateSystemTask.mockResolvedValue({
      status: 'success',
      task: { id: 'system-task-1' },
    });

    const workflow = createWorkflow();
    const trigger = createTrigger();

    const result = await service.syncTrigger(workflow, trigger);

    expect(mockCreateSystemTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(result.config.backend).toBe('system');
    expect(result.config.bindingTaskId).toBe('system-task-1');
    expect(result.config.runtimeSource).toBe('system-scheduler');
    expect(result.config.syncStatus).toBe('synced');
  });

  it('syncs event triggers to app scheduler when system backend is requested on tauri', async () => {
    mockIsTauri.mockReturnValue(true);
    mockCreateTask.mockResolvedValue({ id: 'app-event-task-1' });

    const workflow = createWorkflow();
    const trigger = createTrigger({
      type: 'event',
      config: {
        backend: 'system',
        eventType: 'message.created',
        eventSource: 'chat-panel',
      },
    });

    const result = await service.syncTrigger(workflow, trigger);

    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: {
          type: 'event',
          eventType: 'message.created',
          eventSource: 'chat-panel',
        },
      })
    );
    expect(mockCreateSystemTask).not.toHaveBeenCalled();
    expect(result.config.backend).toBe('app');
    expect(result.config.bindingTaskId).toBe('app-event-task-1');
    expect(result.config.runtimeSource).toBe('app-scheduler');
    expect(result.config.syncStatus).toBe('synced');
  });

  it('marks sync status as error when system scheduler needs confirmation', async () => {
    mockIsTauri.mockReturnValue(true);
    mockCreateSystemTask.mockResolvedValue({
      status: 'confirmation_required',
      confirmation: {
        warnings: ['requires elevated permissions'],
      },
    });

    const workflow = createWorkflow();
    const trigger = createTrigger();

    const result = await service.syncTrigger(workflow, trigger);

    expect(result.config.syncStatus).toBe('error');
    expect(result.config.lastSyncError).toContain('requires elevated permissions');
  });

  it('migrates trigger from app scheduler to system scheduler on backend switch', async () => {
    mockIsTauri.mockReturnValue(true);
    mockCreateSystemTask.mockResolvedValue({
      status: 'success',
      task: { id: 'system-task-2' },
    });
    mockDeleteTask.mockResolvedValue(true);

    const workflow = createWorkflow();
    const trigger = createTrigger({
      config: {
        cronExpression: '0 9 * * *',
        timezone: 'UTC',
        backend: 'system',
        bindingTaskId: 'app-task-legacy',
        runtimeSource: 'app-scheduler',
      },
    });

    const result = await service.syncTrigger(workflow, trigger);

    expect(mockCreateSystemTask).toHaveBeenCalledTimes(1);
    expect(mockDeleteTask).toHaveBeenCalledWith('app-task-legacy');
    expect(result.config.backend).toBe('system');
    expect(result.config.bindingTaskId).toBe('system-task-2');
    expect(result.config.runtimeSource).toBe('system-scheduler');
    expect(result.config.syncStatus).toBe('synced');
  });

  it('rolls back target task when migration cleanup fails', async () => {
    mockIsTauri.mockReturnValue(true);
    mockCreateSystemTask.mockResolvedValue({
      status: 'success',
      task: { id: 'system-task-rollback' },
    });
    mockDeleteTask.mockRejectedValue(new Error('failed to delete old app task'));
    mockDeleteSystemTask.mockResolvedValue(true);

    const workflow = createWorkflow();
    const trigger = createTrigger({
      config: {
        cronExpression: '0 9 * * *',
        timezone: 'UTC',
        backend: 'system',
        bindingTaskId: 'app-task-stale',
        runtimeSource: 'app-scheduler',
      },
    });

    const result = await service.syncTrigger(workflow, trigger);

    expect(mockDeleteSystemTask).toHaveBeenCalledWith('system-task-rollback');
    expect(result.config.syncStatus).toBe('error');
    expect(result.config.bindingTaskId).toBe('app-task-stale');
    expect(result.config.runtimeSource).toBe('app-scheduler');
    expect(result.config.lastSyncError).toContain('target task rollback completed');
  });

  it('unsyncs app trigger and clears stale binding metadata', async () => {
    const trigger = createTrigger({
      config: {
        backend: 'app',
        bindingTaskId: 'app-task-2',
        syncStatus: 'synced',
        runtimeSource: 'app-scheduler',
      },
    });

    const result = await service.unsyncTrigger(trigger);

    expect(mockInitSchedulerSystem).toHaveBeenCalledTimes(1);
    expect(mockDeleteTask).toHaveBeenCalledWith('app-task-2');
    expect(result.config.bindingTaskId).toBeUndefined();
    expect(result.config.syncStatus).toBe('idle');
    expect(result.config.runtimeSource).toBeUndefined();
    expect(result.config.lastSyncError).toBeUndefined();
  });

  it('deduplicates concurrent syncAll calls for the same workflow', async () => {
    const workflow = createWorkflow();
    workflow.settings.triggers = [createTrigger({ id: 'trigger-lock-1' })];

    let resolveSync: ((trigger: WorkflowTrigger) => void) | undefined;
    const syncPromise = new Promise<WorkflowTrigger>((resolve) => {
      resolveSync = resolve;
    });
    const syncTriggerSpy = jest.spyOn(service, 'syncTrigger').mockReturnValue(syncPromise);

    const p1 = service.syncAll(workflow);
    const p2 = service.syncAll(workflow);

    expect(syncTriggerSpy).toHaveBeenCalledTimes(1);

    resolveSync?.(
      createTrigger({
        id: 'trigger-lock-1',
        config: {
          cronExpression: '0 9 * * *',
          timezone: 'UTC',
          syncStatus: 'synced',
          backend: 'app',
          bindingTaskId: 'app-task-lock-1',
        },
      })
    );

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
    expect(r1).toHaveLength(1);
    expect(syncTriggerSpy).toHaveBeenCalledTimes(1);
  });
});

describe('getTriggerSyncBadgeVariant', () => {
  it.each([
    ['synced', 'default'],
    ['syncing', 'secondary'],
    ['out_of_sync', 'outline'],
    ['error', 'destructive'],
    [undefined, 'secondary'],
  ] as const)('maps %s to %s', (status, expected) => {
    expect(getTriggerSyncBadgeVariant(status)).toBe(expected);
  });
});
