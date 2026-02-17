/**
 * Workflow trigger sync service.
 * Maps workflow trigger configuration to system scheduler (desktop) or app scheduler (web fallback).
 */

import { getTaskScheduler, initSchedulerSystem } from '@/lib/scheduler';
import { visualToDefinition } from '@/lib/workflow-editor/converter';
import {
  createCronTrigger,
  createScriptAction,
  createSystemTask,
  deleteSystemTask,
  updateSystemTask,
} from '@/lib/native/system-scheduler';
import { isTauri } from '@/lib/utils';
import type {
  TriggerBackend,
  TriggerSyncStatus,
  TriggerType,
  VisualWorkflow,
  WorkflowTrigger,
} from '@/types/workflow/workflow-editor';
import type { CreateScheduledTaskInput, CreateSystemTaskInput, TaskTrigger } from '@/types/scheduler';
import { isConfirmationRequired, isTaskOperationError, isTaskOperationSuccess } from '@/types/scheduler';

function now(): Date {
  return new Date();
}

function buildTriggerTaskName(workflow: VisualWorkflow, trigger: WorkflowTrigger): string {
  return `[Workflow] ${workflow.name} :: ${trigger.name}`;
}

function resolveDefaultBackend(triggerType: TriggerType): TriggerBackend {
  if (triggerType === 'schedule') {
    return isTauri() ? 'system' : 'app';
  }
  if (triggerType === 'event') {
    return 'app';
  }
  return 'none';
}

export function resolveTriggerBackend(trigger: Pick<WorkflowTrigger, 'type' | 'config'>): TriggerBackend {
  if (trigger.type !== 'schedule' && trigger.type !== 'event') {
    return 'none';
  }

  const configured = trigger.config.backend;
  if (configured === 'system') {
    if (trigger.type === 'event') {
      return 'app';
    }
    return isTauri() ? 'system' : 'app';
  }

  if (configured === 'app') {
    return 'app';
  }

  return resolveDefaultBackend(trigger.type);
}

function toAppSchedulerTrigger(trigger: WorkflowTrigger): TaskTrigger {
  if (trigger.type === 'schedule') {
    return {
      type: 'cron',
      cronExpression: trigger.config.cronExpression || '0 9 * * *',
      timezone: trigger.config.timezone || 'UTC',
    };
  }

  return {
    type: 'event',
    eventType: trigger.config.eventType || 'workflow.event',
    eventSource: trigger.config.eventSource,
  };
}

async function syncToAppScheduler(
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger
): Promise<string> {
  await initSchedulerSystem();
  const scheduler = getTaskScheduler();

  const triggerPayload = {
    workflowId: workflow.id,
    triggerId: trigger.id,
    workflowDefinition: visualToDefinition(workflow),
    input: {},
  };

  const input: CreateScheduledTaskInput = {
    name: buildTriggerTaskName(workflow, trigger),
    description: `Workflow trigger sync (${trigger.type})`,
    type: 'workflow',
    trigger: toAppSchedulerTrigger(trigger),
    payload: triggerPayload,
    notification: {
      onStart: false,
      onComplete: false,
      onError: true,
      onProgress: false,
      channels: ['toast'],
    },
    tags: ['workflow-trigger', workflow.id, trigger.id],
  };

  if (trigger.config.bindingTaskId) {
    const updated = await scheduler.updateTask(trigger.config.bindingTaskId, {
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      payload: input.payload,
      tags: input.tags,
      status: trigger.enabled ? 'active' : 'paused',
    });
    if (updated) {
      return updated.id;
    }
  }

  const created = await scheduler.createTask(input);
  if (!trigger.enabled) {
    await scheduler.pauseTask(created.id);
  }
  return created.id;
}

function toSystemSchedulerInput(
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger
): CreateSystemTaskInput {
  if (trigger.type !== 'schedule') {
    throw new Error(`System scheduler does not support ${trigger.type} workflow triggers`);
  }

  const definition = visualToDefinition(workflow);
  const payload = {
    workflowId: workflow.id,
    triggerId: trigger.id,
    definition,
    input: {},
    options: {
      triggerId: trigger.id,
      isReplay: false,
    },
  };

  return {
    name: buildTriggerTaskName(workflow, trigger),
    description: `Workflow trigger sync (${trigger.type})`,
    trigger: createCronTrigger(
      trigger.config.cronExpression || '0 9 * * *',
      trigger.config.timezone || 'UTC'
    ),
    action: createScriptAction('workflow', JSON.stringify(payload), {
      timeout_secs: Math.max(30, Math.ceil((workflow.settings.maxExecutionTime || 300000) / 1000)),
      memory_mb: 1024,
      use_sandbox: true,
    }),
    run_level: 'user',
    tags: ['workflow-trigger', workflow.id, trigger.id],
  };
}

async function syncToSystemScheduler(
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger
): Promise<string> {
  const input = toSystemSchedulerInput(workflow, trigger);

  if (trigger.config.bindingTaskId) {
    const updated = await updateSystemTask(trigger.config.bindingTaskId, input, true);
    if (isTaskOperationSuccess(updated)) {
      return updated.task.id;
    }
    if (isConfirmationRequired(updated)) {
      throw new Error(updated.confirmation.warnings.join('; ') || 'System scheduler confirmation required');
    }
    if (isTaskOperationError(updated)) {
      throw new Error(updated.message);
    }
  }

  const created = await createSystemTask(input, false);
  if (isTaskOperationSuccess(created)) {
    return created.task.id;
  }
  if (isConfirmationRequired(created)) {
    throw new Error(created.confirmation.warnings.join('; ') || 'System scheduler confirmation required');
  }
  throw new Error(
    isTaskOperationError(created) ? created.message : 'Failed to create system scheduler task'
  );
}

function toSyncedTriggerConfig(
  trigger: WorkflowTrigger,
  backend: TriggerBackend,
  taskId: string
): WorkflowTrigger {
  return {
    ...trigger,
    config: {
      ...trigger.config,
      backend,
      bindingTaskId: taskId,
      syncStatus: 'synced',
      lastSyncedAt: now(),
      lastSyncError: undefined,
      runtimeSource: backend === 'system' ? 'system-scheduler' : 'app-scheduler',
    },
  };
}

function toSyncErrorTrigger(trigger: WorkflowTrigger, error: unknown): WorkflowTrigger {
  return {
    ...trigger,
    config: {
      ...trigger.config,
      syncStatus: 'error',
      lastSyncError: error instanceof Error ? error.message : String(error),
      lastSyncedAt: now(),
    },
  };
}

export class WorkflowTriggerSyncService {
  private readonly syncAllLocks = new Map<string, Promise<WorkflowTrigger[]>>();

  async syncTrigger(workflow: VisualWorkflow, trigger: WorkflowTrigger): Promise<WorkflowTrigger> {
    if (trigger.type === 'manual' || trigger.type === 'webhook') {
      return {
        ...trigger,
        config: {
          ...trigger.config,
          backend: 'none',
          syncStatus: 'idle',
          bindingTaskId: undefined,
          lastSyncedAt: now(),
          lastSyncError: undefined,
        },
      };
    }

    const backend = resolveTriggerBackend(trigger);
    if (backend === 'none') {
      return trigger;
    }

    try {
      const taskId =
        backend === 'system'
          ? await syncToSystemScheduler(workflow, trigger)
          : await syncToAppScheduler(workflow, trigger);
      return toSyncedTriggerConfig(trigger, backend, taskId);
    } catch (error) {
      return toSyncErrorTrigger(trigger, error);
    }
  }

  async unsyncTrigger(trigger: WorkflowTrigger): Promise<WorkflowTrigger> {
    const backend = trigger.config.backend || 'none';
    const taskId = trigger.config.bindingTaskId;

    if (taskId) {
      try {
        if (backend === 'system' && isTauri()) {
          await deleteSystemTask(taskId);
        } else if (backend === 'app') {
          await initSchedulerSystem();
          await getTaskScheduler().deleteTask(taskId);
        }
      } catch {
        // no-op: unsync should still clear stale binding metadata
      }
    }

    return {
      ...trigger,
      config: {
        ...trigger.config,
        bindingTaskId: undefined,
        syncStatus: 'idle',
        runtimeSource: undefined,
        lastSyncedAt: now(),
        lastSyncError: undefined,
      },
    };
  }

  async syncAll(workflow: VisualWorkflow): Promise<WorkflowTrigger[]> {
    const existing = this.syncAllLocks.get(workflow.id);
    if (existing) {
      return existing;
    }

    const syncPromise = (async () => {
      const synced: WorkflowTrigger[] = [];
      for (const trigger of workflow.settings.triggers || []) {
        if (!trigger.enabled) {
          synced.push(await this.unsyncTrigger(trigger));
          continue;
        }

        synced.push(await this.syncTrigger(workflow, trigger));
      }
      return synced;
    })();

    this.syncAllLocks.set(workflow.id, syncPromise);
    try {
      return await syncPromise;
    } finally {
      this.syncAllLocks.delete(workflow.id);
    }
  }
}

export const workflowTriggerSyncService = new WorkflowTriggerSyncService();

export function getTriggerSyncBadgeVariant(
  syncStatus: TriggerSyncStatus | undefined
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (syncStatus) {
    case 'synced':
      return 'default';
    case 'syncing':
      return 'secondary';
    case 'error':
      return 'destructive';
    case 'out_of_sync':
      return 'outline';
    case 'idle':
    default:
      return 'secondary';
  }
}

export default workflowTriggerSyncService;
