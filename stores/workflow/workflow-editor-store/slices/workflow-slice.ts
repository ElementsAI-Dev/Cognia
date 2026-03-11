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
import {
  normalizeServerValidationErrors,
  summarizeServerValidationErrors,
} from '@/lib/workflow-editor/server-validation';
import type { WorkflowTrigger } from '@/types/workflow/workflow-editor';
import { deriveEditorLifecycleState } from '../utils/lifecycle';

let metaHistoryTimer: ReturnType<typeof setTimeout> | undefined;
const saveLocks = new Map<string, Promise<void>>();

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  const root = asRecord(error);
  const message = root && typeof root.message === 'string' ? root.message : null;
  if (message && message.trim().length > 0) {
    return message;
  }

  const response = root ? asRecord(root.response) : null;
  const responseData = response ? asRecord(response.data) : null;
  const responseMessage =
    responseData && typeof responseData.message === 'string' ? responseData.message : null;

  if (responseMessage && responseMessage.trim().length > 0) {
    return responseMessage;
  }

  return 'Unknown error';
}

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
  editorLifecycleState: 'clean',
  lastSaveError: null,
  lastMutation: null,
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
        editorLifecycleState: 'clean',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:create',
          occurredAt: new Date(),
        },
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
        editorLifecycleState: 'clean',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:load',
          occurredAt: new Date(),
        },
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
        editorLifecycleState: 'dirty',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:load',
          occurredAt: new Date(),
          metadata: { fromTemplate: true },
        },
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
          set({
            editorLifecycleState: 'saving',
            lastSaveError: null,
          });

          const migrated = migrateWorkflowSchema(currentWorkflow).workflow;
          let saved = await workflowRepository.save({
            ...migrated,
            updatedAt: new Date(),
          });

          const currentTriggers = saved.settings.triggers || [];
          let syncErrorCount = 0;
          let syncErrorDetails: string[] = [];
          let syncFailedMessage: string | null = null;

          if (currentTriggers.length > 0) {
            try {
              const syncedTriggers = await workflowTriggerSyncService.syncAll(saved);
              const failedTriggers = syncedTriggers.filter(
                (trigger) => trigger.config.syncStatus === 'error'
              );
              syncErrorCount = failedTriggers.length;
              syncErrorDetails = failedTriggers.map((trigger) => {
                const taskRef = trigger.config.bindingTaskId
                  ? `task ${trigger.config.bindingTaskId}`
                  : 'task unbound';
                const reason = trigger.config.lastSyncError || 'unknown sync error';
                return `${trigger.name} (${taskRef}): ${reason}`;
              });

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
            editorLifecycleState: 'clean',
            lastSaveError: null,
            lastMutation: {
              kind: 'workflow:update-meta',
              occurredAt: new Date(),
              metadata: { save: true },
            },
          });
          get().clearServerValidationErrors();

          if (syncFailedMessage) {
            toast.warning('Workflow saved, but trigger sync failed', {
              description: syncFailedMessage,
            });
            return;
          }

          if (syncErrorCount > 0) {
            const detailPreview = syncErrorDetails.slice(0, 2).join('; ');
            const moreCount = Math.max(syncErrorDetails.length - 2, 0);
            toast.warning('Workflow saved with trigger sync errors', {
              description:
                detailPreview.length > 0
                  ? `${detailPreview}${moreCount > 0 ? `; +${moreCount} more` : ''}`
                  : `${syncErrorCount} trigger(s) need attention`,
            });
            return;
          }

          toast.success('Workflow saved successfully');
        } catch (error) {
          const message = getErrorMessage(error);
          const serverValidationErrors = normalizeServerValidationErrors(error);
          if (serverValidationErrors.length > 0) {
            get().setServerValidationErrors(serverValidationErrors);
          }

          set({
            editorLifecycleState: 'saveFailed',
            lastSaveError: message,
          });

          toast.error('Failed to save workflow', {
            description:
              serverValidationErrors.length > 0
                ? summarizeServerValidationErrors(serverValidationErrors)
                : message,
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
                  editorLifecycleState: 'clean',
                  lastSaveError: null,
                  lastMutation: null,
                  validationErrors: [],
                }
              : {}),
          });

          toast.success('Workflow deleted');
        } catch (error) {
          const message = getErrorMessage(error);
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
          const message = getErrorMessage(error);
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

      set({
        currentWorkflow: updated,
        isDirty: true,
        editorLifecycleState: 'dirty',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:update-meta',
          occurredAt: new Date(),
        },
      });
      get().clearServerValidationErrors();
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

      set({
        currentWorkflow: updated,
        isDirty: true,
        editorLifecycleState: 'dirty',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:update-settings',
          occurredAt: new Date(),
        },
      });
      get().clearServerValidationErrors();
    },

    updateWorkflowVariables: (variables) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        variables,
        updatedAt: new Date(),
      };

      set({
        currentWorkflow: updated,
        isDirty: true,
        editorLifecycleState: 'dirty',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:update-variables',
          occurredAt: new Date(),
        },
      });
      get().clearServerValidationErrors();
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

      set({
        currentWorkflow: updated,
        isDirty: true,
        editorLifecycleState: 'dirty',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:set-variable',
          occurredAt: new Date(),
          metadata: { name },
        },
      });
      get().clearServerValidationErrors();
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

      set({
        currentWorkflow: updated,
        isDirty: true,
        editorLifecycleState: 'dirty',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:delete-variable',
          occurredAt: new Date(),
          metadata: { name },
        },
      });
      get().clearServerValidationErrors();
      scheduleMetaHistoryPush(updated.id);
    },

    publishWorkflow: () => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const errors = get().validate();
      if (
        errors.some(
          (error) => error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info')
        )
      ) {
        set({
          editorLifecycleState: 'publishBlocked',
        });
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

      set({
        currentWorkflow: updated,
        isDirty: true,
        editorLifecycleState: 'readyToPublish',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:publish',
          occurredAt: new Date(),
        },
      });
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

      set({
        currentWorkflow: updated,
        isDirty: true,
        editorLifecycleState: 'dirty',
        lastSaveError: null,
        lastMutation: {
          kind: 'workflow:unpublish',
          occurredAt: new Date(),
        },
      });
      toast.info('Workflow unpublished');
    },

    syncLifecycleState: () => {
      const state = get();
      const next = deriveEditorLifecycleState({
        hasWorkflow: Boolean(state.currentWorkflow),
        isDirty: state.isDirty,
        isSaving: state.editorLifecycleState === 'saving',
        hasSaveError: Boolean(state.lastSaveError),
        validationErrors: state.validationErrors,
      });

      if (state.editorLifecycleState !== next) {
        set({
          editorLifecycleState: next,
        });
      }
    },
  };
};

export const clearWorkflowSliceTimers = () => {
  if (metaHistoryTimer) {
    clearTimeout(metaHistoryTimer);
    metaHistoryTimer = undefined;
  }
};
