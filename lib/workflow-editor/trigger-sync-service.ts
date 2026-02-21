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

type RuntimeSource = NonNullable<WorkflowTrigger['config']['runtimeSource']>;

function backendToRuntimeSource(backend: TriggerBackend): RuntimeSource | undefined {
  if (backend === 'system') return 'system-scheduler';
  if (backend === 'app') return 'app-scheduler';
  return undefined;
}

function runtimeSourceToBackend(runtimeSource: RuntimeSource): TriggerBackend {
  return runtimeSource === 'system-scheduler' ? 'system' : 'app';
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

async function createInAppScheduler(
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

  const created = await scheduler.createTask(input);
  if (!trigger.enabled) {
    await scheduler.pauseTask(created.id);
  }
  return created.id;
}

async function upsertInAppScheduler(
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger,
  currentTaskId?: string
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

  if (currentTaskId) {
    const updated = await scheduler.updateTask(currentTaskId, {
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

async function createInSystemScheduler(
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger
): Promise<string> {
  const input = toSystemSchedulerInput(workflow, trigger);

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

async function upsertInSystemScheduler(
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger,
  currentTaskId?: string
): Promise<string> {
  const input = toSystemSchedulerInput(workflow, trigger);

  if (currentTaskId) {
    const updated = await updateSystemTask(currentTaskId, input, true);
    if (isTaskOperationSuccess(updated)) {
      return updated.task.id;
    }
    if (isConfirmationRequired(updated)) {
      throw new Error(
        updated.confirmation.warnings.join('; ') || 'System scheduler confirmation required'
      );
    }
    if (isTaskOperationError(updated)) {
      throw new Error(updated.message);
    }
  }

  return createInSystemScheduler(workflow, trigger);
}

async function deleteFromAppScheduler(taskId: string): Promise<void> {
  await initSchedulerSystem();
  await getTaskScheduler().deleteTask(taskId);
}

async function deleteFromSystemScheduler(taskId: string): Promise<void> {
  const deleted = await deleteSystemTask(taskId);
  if (!deleted) {
    throw new Error(`System scheduler task not found: ${taskId}`);
  }
}

async function createOnBackend(
  backend: Exclude<TriggerBackend, 'none'>,
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger
): Promise<string> {
  return backend === 'system'
    ? createInSystemScheduler(workflow, trigger)
    : createInAppScheduler(workflow, trigger);
}

async function upsertOnBackend(
  backend: Exclude<TriggerBackend, 'none'>,
  workflow: VisualWorkflow,
  trigger: WorkflowTrigger,
  currentTaskId?: string
): Promise<string> {
  return backend === 'system'
    ? upsertInSystemScheduler(workflow, trigger, currentTaskId)
    : upsertInAppScheduler(workflow, trigger, currentTaskId);
}

async function deleteFromRuntimeSource(runtimeSource: RuntimeSource, taskId: string): Promise<void> {
  if (runtimeSource === 'system-scheduler') {
    if (!isTauri()) {
      throw new Error('System scheduler migration requires desktop runtime');
    }
    await deleteFromSystemScheduler(taskId);
    return;
  }
  await deleteFromAppScheduler(taskId);
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class WorkflowTriggerSyncService {
  private readonly syncAllLocks = new Map<string, Promise<WorkflowTrigger[]>>();
  private readonly syncTriggerLocks = new Map<string, Promise<WorkflowTrigger>>();

  private async withSyncTriggerLock(
    workflowId: string,
    triggerId: string,
    action: () => Promise<WorkflowTrigger>
  ): Promise<WorkflowTrigger> {
    const key = `${workflowId}:${triggerId}`;
    const existing = this.syncTriggerLocks.get(key);
    if (existing) {
      return existing;
    }

    const promise = action();
    this.syncTriggerLocks.set(key, promise);

    try {
      return await promise;
    } finally {
      this.syncTriggerLocks.delete(key);
    }
  }

  private async migrateTrigger(
    workflow: VisualWorkflow,
    trigger: WorkflowTrigger,
    targetBackend: Exclude<TriggerBackend, 'none'>,
    sourceRuntime: RuntimeSource,
    sourceTaskId: string
  ): Promise<WorkflowTrigger> {
    let targetTaskId: string | undefined;
    let migrationPhase: 'create_target' | 'delete_source' | 'rollback_target' = 'create_target';

    try {
      targetTaskId = await createOnBackend(targetBackend, workflow, trigger);
      migrationPhase = 'delete_source';
      await deleteFromRuntimeSource(sourceRuntime, sourceTaskId);
      return toSyncedTriggerConfig(trigger, targetBackend, targetTaskId);
    } catch (migrationError) {
      if (!targetTaskId) {
        throw new Error(
          `Trigger migration failed at phase=${migrationPhase}: ${errorMessage(migrationError)}`
        );
      }

      migrationPhase = 'rollback_target';
      try {
        const targetRuntime = backendToRuntimeSource(targetBackend);
        if (!targetRuntime) {
          throw new Error('Cannot resolve target runtime source');
        }
        await deleteFromRuntimeSource(targetRuntime, targetTaskId);
      } catch (rollbackError) {
        throw new Error(
          `Trigger migration failed at phase=delete_source: ${errorMessage(
            migrationError
          )}; rollback failed at phase=${migrationPhase}: ${errorMessage(rollbackError)}`
        );
      }

      throw new Error(
        `Trigger migration failed at phase=delete_source: ${errorMessage(
          migrationError
        )}; target task rollback completed`
      );
    }
  }

  async syncTrigger(workflow: VisualWorkflow, trigger: WorkflowTrigger): Promise<WorkflowTrigger> {
    return this.withSyncTriggerLock(workflow.id, trigger.id, async () => {
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
        const currentRuntime = trigger.config.runtimeSource;
        const currentTaskId = trigger.config.bindingTaskId;
        const currentBackend = currentRuntime ? runtimeSourceToBackend(currentRuntime) : undefined;

        if (
          currentTaskId &&
          currentRuntime &&
          currentBackend !== 'none' &&
          currentBackend !== backend
        ) {
          return await this.migrateTrigger(workflow, trigger, backend, currentRuntime, currentTaskId);
        }

        const upsertTaskId = currentTaskId && (!currentBackend || currentBackend === backend)
          ? currentTaskId
          : undefined;
        const taskId = await upsertOnBackend(backend, workflow, trigger, upsertTaskId);
        return toSyncedTriggerConfig(trigger, backend, taskId);
      } catch (error) {
        return toSyncErrorTrigger(trigger, error);
      }
    });
  }

  async unsyncTrigger(trigger: WorkflowTrigger): Promise<WorkflowTrigger> {
    const backend = trigger.config.backend || 'none';
    const taskId = trigger.config.bindingTaskId;
    const runtimeSource =
      trigger.config.runtimeSource || (backendToRuntimeSource(backend) as RuntimeSource | undefined);

    if (taskId && runtimeSource) {
      try {
        await deleteFromRuntimeSource(runtimeSource, taskId);
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
