/**
 * Template Slice
 * Handles node templates: save, add, delete, update
 */

import { nanoid } from 'nanoid';
import type {
  SliceCreator,
  TemplateSliceActions,
  TemplateSliceState,
  WorkflowNode,
  WorkflowNodeType,
} from '../types';
import { applyWorkflowMutation } from '../utils/mutation';
import { createNodeTemplate } from '@/types/workflow/workflow-editor';

export const templateSliceInitialState: TemplateSliceState = {
  nodeTemplates: [],
};

export const createTemplateSlice: SliceCreator<TemplateSliceActions> = (set, get) => {
  return {
    saveNodeAsTemplate: (nodeId, name, options) => {
      const { currentWorkflow, nodeTemplates } = get();
      if (!currentWorkflow) return null;

      const node = currentWorkflow.nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const template = createNodeTemplate(name, node.type as WorkflowNodeType, node.data, {
        description: options?.description,
        category: options?.category,
        tags: options?.tags,
      });

      set({ nodeTemplates: [...nodeTemplates, template] });
      return template;
    },

    addNodeFromTemplate: (templateId, position) => {
      const { currentWorkflow, nodeTemplates } = get();
      if (!currentWorkflow) return null;

      const template = nodeTemplates.find((t) => t.id === templateId);
      if (!template) return null;

      const nodeId = `node-${nanoid()}`;
      const newNode: WorkflowNode = {
        id: nodeId,
        type: template.nodeType,
        position,
        data: {
          ...template.data,
          label: template.name,
        },
      };

      applyWorkflowMutation({
        set,
        get,
        kind: 'node:add',
        nodeIds: [newNode.id],
        metadata: { source: 'template', templateId },
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: [...workflow.nodes, newNode],
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedNodes: [newNode.id],
          selectedEdges: [],
        },
        pushHistory: true,
        validate: true,
      });

      return nodeId;
    },

    deleteNodeTemplate: (templateId) => {
      const { nodeTemplates } = get();
      set({
        nodeTemplates: nodeTemplates.filter((t) => t.id !== templateId),
      });
    },

    updateNodeTemplate: (templateId, updates) => {
      const { nodeTemplates } = get();
      set({
        nodeTemplates: nodeTemplates.map((t) =>
          t.id === templateId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
      });
    },
  };
};
