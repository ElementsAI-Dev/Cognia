/**
 * Workflow Slice
 * Handles workflow CRUD operations, metadata, settings, and variables
 */

import { toast } from 'sonner';
import type { SliceCreator, WorkflowSliceActions, WorkflowSliceState } from '../types';
import { createEmptyVisualWorkflow } from '@/types/workflow/workflow-editor';
import { workflowRepository } from '@/lib/db/repositories';

let metaHistoryTimer: ReturnType<typeof setTimeout> | undefined;

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
      const { currentWorkflow, savedWorkflows } = get();
      if (!currentWorkflow) return;

      try {
        const saved = await workflowRepository.save({
          ...currentWorkflow,
          updatedAt: new Date(),
        });

        const existingIndex = savedWorkflows.findIndex((w) => w.id === saved.id);
        const newSavedWorkflows =
          existingIndex >= 0
            ? savedWorkflows.map((w, i) => (i === existingIndex ? saved : w))
            : [...savedWorkflows, saved];

        set({
          currentWorkflow: saved,
          savedWorkflows: newSavedWorkflows,
          isDirty: false,
        });

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
  };
};

export const clearWorkflowSliceTimers = () => {
  if (metaHistoryTimer) {
    clearTimeout(metaHistoryTimer);
    metaHistoryTimer = undefined;
  }
};
