import { toast } from 'sonner';
import type { VisualWorkflow, WorkflowTrigger } from '@/types/workflow/workflow-editor';
import { workflowRepository } from '@/lib/db/repositories';
import { workflowTriggerSyncService } from '@/lib/workflow-editor/trigger-sync-service';
import { createWorkflowSlice, clearWorkflowSliceTimers } from './workflow-slice';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    save: jest.fn(),
    delete: jest.fn(),
    duplicate: jest.fn(),
  },
}));

jest.mock('@/lib/workflow-editor/trigger-sync-service', () => ({
  workflowTriggerSyncService: {
    syncAll: jest.fn(),
  },
}));

jest.mock('@/lib/workflow-editor/migration', () => ({
  migrateWorkflowSchema: jest.fn((workflow: unknown) => ({
    workflow,
    migrated: false,
    fromVersion: '2.0',
    toVersion: '2.0',
    warnings: [],
  })),
}));

type SliceState = {
  currentWorkflow: VisualWorkflow | null;
  savedWorkflows: VisualWorkflow[];
  isDirty: boolean;
  pushHistory: jest.Mock;
  saveWorkflow: () => Promise<void>;
};

function createTrigger(overrides?: Partial<WorkflowTrigger>): WorkflowTrigger {
  return {
    id: 'trigger-1',
    name: 'Daily Trigger',
    type: 'schedule',
    enabled: true,
    config: {
      cronExpression: '0 9 * * *',
      timezone: 'UTC',
      syncStatus: 'idle',
      ...overrides?.config,
    },
    ...overrides,
  };
}

function createWorkflow(overrides?: Partial<VisualWorkflow>): VisualWorkflow {
  const now = new Date('2025-01-01T00:00:00.000Z');
  return {
    id: 'workflow-1',
    schemaVersion: '2.0',
    name: 'Test Workflow',
    description: 'desc',
    type: 'custom',
    version: '1',
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
      triggers: [],
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createStore(initial?: Partial<SliceState>): { getState: () => SliceState } {
  let state: SliceState = {
    currentWorkflow: null,
    savedWorkflows: [],
    isDirty: true,
    pushHistory: jest.fn(),
    saveWorkflow: async () => undefined,
    ...initial,
  };

  const set = (partial: Partial<SliceState> | ((prev: SliceState) => Partial<SliceState>)) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    state = {
      ...state,
      ...update,
    };
  };

  const get = () => state;
  const actions = createWorkflowSlice(set as never, get as never);
  state = {
    ...state,
    ...actions,
  } as SliceState;

  return {
    getState: () => state,
  };
}

describe('workflow-slice saveWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearWorkflowSliceTimers();
  });

  it('coalesces concurrent saveWorkflow calls for the same workflow', async () => {
    const workflow = createWorkflow();
    const store = createStore({ currentWorkflow: workflow });

    let resolveSave: ((value: VisualWorkflow) => void) | undefined;
    const savePromise = new Promise<VisualWorkflow>((resolve) => {
      resolveSave = resolve;
    });
    (workflowRepository.save as jest.Mock).mockReturnValue(savePromise);

    const p1 = store.getState().saveWorkflow();
    const p2 = store.getState().saveWorkflow();

    expect(workflowRepository.save).toHaveBeenCalledTimes(1);
    resolveSave?.(createWorkflow({ updatedAt: new Date('2025-01-01T00:01:00.000Z') }));

    await Promise.all([p1, p2]);

    expect(workflowRepository.save).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('syncs triggers after save and re-saves when synced triggers changed', async () => {
    const trigger = createTrigger({ config: { syncStatus: 'idle' } });
    const workflow = createWorkflow({
      settings: {
        ...createWorkflow().settings,
        triggers: [trigger],
      },
    });
    const saved = createWorkflow({
      ...workflow,
      updatedAt: new Date('2025-01-01T00:01:00.000Z'),
    });
    const syncedTrigger = createTrigger({
      config: {
        ...trigger.config,
        syncStatus: 'synced',
        backend: 'app',
        bindingTaskId: 'task-1',
        lastSyncedAt: new Date('2025-01-01T00:02:00.000Z'),
      },
    });
    const savedAfterSync = createWorkflow({
      ...saved,
      settings: {
        ...saved.settings,
        triggers: [syncedTrigger],
      },
      updatedAt: new Date('2025-01-01T00:03:00.000Z'),
    });

    const store = createStore({ currentWorkflow: workflow });

    (workflowRepository.save as jest.Mock)
      .mockResolvedValueOnce(saved)
      .mockResolvedValueOnce(savedAfterSync);
    (workflowTriggerSyncService.syncAll as jest.Mock).mockResolvedValue([syncedTrigger]);

    await store.getState().saveWorkflow();

    expect(workflowTriggerSyncService.syncAll).toHaveBeenCalledWith(saved);
    expect(workflowRepository.save).toHaveBeenCalledTimes(2);
    expect((workflowRepository.save as jest.Mock).mock.calls[1][0].settings.triggers).toEqual([
      syncedTrigger,
    ]);
    expect(store.getState().currentWorkflow?.settings.triggers).toEqual([syncedTrigger]);
    expect(store.getState().isDirty).toBe(false);
  });

  it('does not re-save when synced triggers are equivalent', async () => {
    const now = new Date('2025-01-01T00:02:00.000Z');
    const trigger = createTrigger({
      config: {
        syncStatus: 'synced',
        backend: 'app',
        bindingTaskId: 'task-1',
        lastSyncedAt: now,
      },
    });
    const saved = createWorkflow({
      settings: {
        ...createWorkflow().settings,
        triggers: [trigger],
      },
    });
    const synced = createTrigger({
      ...trigger,
      config: {
        ...trigger.config,
        lastSyncedAt: new Date(now.toISOString()),
      },
    });
    const store = createStore({ currentWorkflow: saved });

    (workflowRepository.save as jest.Mock).mockResolvedValue(saved);
    (workflowTriggerSyncService.syncAll as jest.Mock).mockResolvedValue([synced]);

    await store.getState().saveWorkflow();

    expect(workflowRepository.save).toHaveBeenCalledTimes(1);
    expect(workflowTriggerSyncService.syncAll).toHaveBeenCalledTimes(1);
  });

  it('shows warning when trigger sync throws after successful save', async () => {
    const trigger = createTrigger();
    const workflow = createWorkflow({
      settings: {
        ...createWorkflow().settings,
        triggers: [trigger],
      },
    });
    const saved = createWorkflow({ ...workflow, updatedAt: new Date('2025-01-01T00:01:00.000Z') });
    const store = createStore({ currentWorkflow: workflow });

    (workflowRepository.save as jest.Mock).mockResolvedValue(saved);
    (workflowTriggerSyncService.syncAll as jest.Mock).mockRejectedValue(new Error('sync failed'));

    await store.getState().saveWorkflow();

    expect(workflowRepository.save).toHaveBeenCalledTimes(1);
    expect(toast.warning).toHaveBeenCalledWith('Workflow saved, but trigger sync failed', {
      description: 'sync failed',
    });
  });

  it('shows warning when synced triggers contain errors', async () => {
    const errorTrigger = createTrigger({
      config: {
        syncStatus: 'error',
        lastSyncError: 'permission denied',
      },
    });
    const workflow = createWorkflow({
      settings: {
        ...createWorkflow().settings,
        triggers: [errorTrigger],
      },
    });
    const store = createStore({ currentWorkflow: workflow });

    (workflowRepository.save as jest.Mock).mockResolvedValue(workflow);
    (workflowTriggerSyncService.syncAll as jest.Mock).mockResolvedValue([errorTrigger]);

    await store.getState().saveWorkflow();

    expect(toast.warning).toHaveBeenCalledWith('Workflow saved with trigger sync errors', {
      description: '1 trigger(s) need attention',
    });
  });
});
