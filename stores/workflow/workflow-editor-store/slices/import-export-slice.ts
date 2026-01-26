/**
 * Import/Export Slice
 * Handles workflow import and export operations
 */

import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import type { SliceCreator, ImportExportSliceActions, NodeTemplate } from '../types';
import { createWorkflowExport } from '@/types/workflow/workflow-editor';
import { workflowRepository } from '@/lib/db/repositories';

export const createImportExportSlice: SliceCreator<ImportExportSliceActions> = (set, get) => {
  return {
    exportWorkflow: (options) => {
      const { currentWorkflow, nodeTemplates } = get();
      if (!currentWorkflow) return null;

      return createWorkflowExport(currentWorkflow, {
        includeTemplates: options?.includeTemplates ? nodeTemplates : undefined,
      });
    },

    importWorkflow: (data) => {
      const workflow = data.workflow;
      workflow.id = `workflow-${nanoid()}`;
      workflow.createdAt = new Date();
      workflow.updatedAt = new Date();

      set({
        currentWorkflow: workflow,
        isDirty: false,
        selectedNodes: [],
        selectedEdges: [],
      });

      if (data.templates && data.templates.length > 0) {
        const { nodeTemplates } = get();
        set({
          nodeTemplates: [...nodeTemplates, ...data.templates],
        });
      }

      toast.success('Workflow imported successfully');
    },

    exportToFile: () => {
      const exportData = get().exportWorkflow({ includeTemplates: true });
      if (!exportData) return;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportData.workflow.name || 'workflow'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Workflow exported');
    },

    importFromFile: async (file) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        const workflow = await workflowRepository.import(text);

        set({
          currentWorkflow: workflow,
          isDirty: false,
          selectedNodes: [],
          selectedEdges: [],
          history: [workflow],
          historyIndex: 0,
        });

        if (
          parsed &&
          typeof parsed === 'object' &&
          'templates' in parsed &&
          Array.isArray((parsed as { templates?: unknown }).templates)
        ) {
          const templates = (parsed as { templates?: NodeTemplate[] }).templates;
          if (templates && templates.length > 0) {
            const { nodeTemplates } = get();
            set({
              nodeTemplates: [...nodeTemplates, ...templates],
            });
          }
        }

        toast.success('Workflow imported from file');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Failed to import workflow', {
          description: message,
        });
      }
    },
  };
};
