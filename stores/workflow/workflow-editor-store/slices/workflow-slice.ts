/**
 * Workflow Slice
 * Handles workflow CRUD operations, metadata, settings, and variables
 */

import { toast } from 'sonner';
import type { SliceCreator, WorkflowSliceActions, WorkflowSliceState } from '../types';
import { createEmptyVisualWorkflow } from '@/types/workflow/workflow-editor';
import { workflowRepository } from '@/lib/db/repositories';
import { workflowTriggerSyncService } from '@/lib/workflow-editor/trigger-sync-service';
import { migrateWorkflowSchema } from '@/lib/workflow-editor/migration';
import type { WorkflowTrigger } from '@/types/workflow/workflow-editor';

let metaHistoryTimer: ReturnType<typeof setTimeout> | undefined;
const saveLocks = new Map<string, Promise<void>>();

function normalizeTriggerForCompare(trigger: WorkflowTrigger): Record<string, unknown> {
  return {
    ...trigger,
    config: {
      ...trigger.config,
      lastSyncedAt: trigger.config.lastSyncedAt
        ? new Date(trigger.config.lastSyncedAt).toISOString()
        : undefined,
    },
  };
}

function areTriggersEquivalent(a: WorkflowTrigger[] = [], b: WorkflowTrigger[] = []): boolean {
  if (a.length !== b.length) return false;

  const sortById = (left: WorkflowTrigger, right: WorkflowTrigger) => left.id.localeCompare(right.id);
  const left = [...a].sort(sortById).map(normalizeTriggerForCompare);
  const right = [...b].sort(sortById).map(normalizeTriggerForCompare);
  return JSON.stringify(left) === JSON.stringify(right);
}

export const workflowSliceInitialState: WorkflowSliceState = {
  currentWorkflow: null,
  savedWorkflows: [],
  isDirty: false,
};

export const createWorkflowSlice: SliceCreator<WorkflowSliceActions> = (set, get) => {
  const scheduleMetaHistoryPush = (workflowId: string) => {
    if (metaHistoryTimer) {
      clearTimeout(metaHistoryTimer);
    }

    metaHistoryTimer = setTimeout(() => {
      metaHistoryTimer = undefined;
      const { currentWorkflow } = get();
      if (!currentWorkflow || currentWorkflow.id !== workflowId) return;
      get().pushHistory();
    }, 300);
  };

  return {
    createWorkflow: (name) => {
      const workflow = createEmptyVisualWorkflow(name);
      set({
        currentWorkflow: workflow,
        selectedNodes: [],
        selectedEdges: [],
        history: [workflow],
        historyIndex: 0,
        isDirty: false,
        validationErrors: [],
      });
    },

    loadWorkflow: (workflow) => {
      set({
        currentWorkflow: workflow,
        selectedNodes: [],
        selectedEdges: [],
        history: [workflow],
        historyIndex: 0,
        isDirty: false,
        validationErrors: [],
        executionState: null,
        isExecuting: false,
      });
    },

    loadFromTemplate: (workflow) => {
      // Create a copy with new ID and timestamps for template-based workflow
      const templateWorkflow = {
        ...workflow,
        id: `workflow-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set({
        currentWorkflow: templateWorkflow,
        selectedNodes: [],
        selectedEdges: [],
        history: [templateWorkflow],
        historyIndex: 0,
        isDirty: true,
        validationErrors: [],
        executionState: null,
        isExecuting: false,
      });
    },

    saveWorkflow: async () => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const existingSave = saveLocks.get(currentWorkflow.id);
      if (existingSave) {
        await existingSave;
        return;
      }

      const savePromise = (async () => {
        try {
          const migrated = migrateWorkflowSchema(currentWorkflow).workflow;
          let saved = await workflowRepository.save({
            ...migrated,
            updatedAt: new Date(),
          });

          const currentTriggers = saved.settings.triggers || [];
          let syncErrorCount = 0;
          let syncFailedMessage: string | null = null;

          if (currentTriggers.length > 0) {
            try {
              const syncedTriggers = await workflowTriggerSyncService.syncAll(saved);
              syncErrorCount = syncedTriggers.filter((trigger) => trigger.config.syncStatus === 'error').length;

              if (!areTriggersEquivalent(currentTriggers, syncedTriggers)) {
                saved = await workflowRepository.save({
                  ...saved,
                  settings: {
                    ...saved.settings,
                    triggers: syncedTriggers,
                  },
                  updatedAt: new Date(),
                });
              }
            } catch (syncError) {
              syncFailedMessage =
                syncError instanceof Error ? syncError.message : String(syncError);
            }
          }

          const latestState = get();
          const latestSavedWorkflows = latestState.savedWorkflows;
          const existingIndex = latestSavedWorkflows.findIndex((w) => w.id === saved.id);
          const newSavedWorkflows =
            existingIndex >= 0
              ? latestSavedWorkflows.map((w, i) => (i === existingIndex ? saved : w))
              : [...latestSavedWorkflows, saved];

          const shouldUpdateCurrentWorkflow = latestState.currentWorkflow?.id === saved.id;

          set({
            currentWorkflow: shouldUpdateCurrentWorkflow ? saved : latestState.currentWorkflow,
            savedWorkflows: newSavedWorkflows,
            isDirty: false,
          });

          if (syncFailedMessage) {
            toast.warning('Workflow saved, but trigger sync failed', {
              description: syncFailedMessage,
            });
            return;
          }

          if (syncErrorCount > 0) {
            toast.warning('Workflow saved with trigger sync errors', {
              description: `${syncErrorCount} trigger(s) need attention`,
            });
            return;
          }

          toast.success('Workflow saved successfully');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast.error('Failed to save workflow', {
            description: message,
            action: {
              label: 'Retry',
              onClick: () => get().saveWorkflow(),
            },
          });
        }
      })();

      saveLocks.set(currentWorkflow.id, savePromise);
      try {
        await savePromise;
      } finally {
        saveLocks.delete(currentWorkflow.id);
      }
    },

    deleteWorkflow: (workflowId) => {
      void (async () => {
        try {
          const deleted = await workflowRepository.delete(workflowId);
          if (!deleted) return;

          const { savedWorkflows, currentWorkflow } = get();
          const isCurrentDeleted = currentWorkflow?.id === workflowId;

          set({
            savedWorkflows: savedWorkflows.filter((w) => w.id !== workflowId),
            currentWorkflow: isCurrentDeleted ? null : currentWorkflow,
            ...(isCurrentDeleted
              ? {
                  history: [],
                  historyIndex: -1,
                  selectedNodes: [],
                  selectedEdges: [],
                  isDirty: false,
                  validationErrors: [],
                }
              : {}),
          });

          toast.success('Workflow deleted');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast.error('Failed to delete workflow', {
            description: message,
          });
        }
      })();
    },

    duplicateWorkflow: (workflowId) => {
      void (async () => {
        try {
          const duplicated = await workflowRepository.duplicate(workflowId);
          if (!duplicated) return;

          const { savedWorkflows } = get();
          set({ savedWorkflows: [...savedWorkflows, duplicated] });

          toast.success('Workflow duplicated');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast.error('Failed to duplicate workflow', {
            description: message,
          });
        }
      })();
    },

    updateWorkflowMeta: (updates) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        ...updates,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      scheduleMetaHistoryPush(updated.id);
    },

    updateWorkflowSettings: (settings) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        settings: { ...currentWorkflow.settings, ...settings },
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
    },

    updateWorkflowVariables: (variables) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        variables,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      scheduleMetaHistoryPush(updated.id);
    },

    setWorkflowVariable: (name, value) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        variables: {
          ...currentWorkflow.variables,
          [name]: value,
        },
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      scheduleMetaHistoryPush(updated.id);
    },

    deleteWorkflowVariable: (name) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const { [name]: _deleted, ...rest } = currentWorkflow.variables;
      const updated = {
        ...currentWorkflow,
        variables: rest,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      scheduleMetaHistoryPush(updated.id);
    },

    publishWorkflow: () => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const errors = get().validate();
      if (errors.some((e) => e.severity === 'error')) {
        toast.error('Cannot publish: workflow has validation errors');
        return;
      }

      const updated = {
        ...currentWorkflow,
        isPublished: true,
        publishedAt: new Date(),
        publishedVersion: (currentWorkflow.publishedVersion || 0) + 1,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      toast.success(`Workflow published (v${updated.publishedVersion})`);
    },

    unpublishWorkflow: () => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        isPublished: false,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      toast.info('Workflow unpublished');
    },
  };
};

export const clearWorkflowSliceTimers = () => {
  if (metaHistoryTimer) {
    clearTimeout(metaHistoryTimer);
    metaHistoryTimer = undefined;
  }
};
