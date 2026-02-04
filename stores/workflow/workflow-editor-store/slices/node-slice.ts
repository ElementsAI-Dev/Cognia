/**
 * Node Slice
 * Handles node operations: add, update, delete, duplicate
 */

import { applyNodeChanges, type NodeChange } from '@xyflow/react';
import { nanoid } from 'nanoid';
import type { SliceCreator, NodeSliceActions, WorkflowNode, WorkflowNodeData } from '../types';
import { scheduleWorkflowValidation } from '../utils/validation-scheduler';
import { createDefaultNodeData } from '@/types/workflow/workflow-editor';

let nodeHistoryTimer: ReturnType<typeof setTimeout> | undefined;

export const createNodeSlice: SliceCreator<NodeSliceActions> = (set, get) => {
  const scheduleNodeHistoryPush = (workflowId: string) => {
    if (nodeHistoryTimer) {
      clearTimeout(nodeHistoryTimer);
    }

    nodeHistoryTimer = setTimeout(() => {
      nodeHistoryTimer = undefined;
      const { currentWorkflow } = get();
      if (!currentWorkflow || currentWorkflow.id !== workflowId) return;
      get().pushHistory();
    }, 300);
  };

  return {
    addNode: (type, position) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return '';

      const nodeId = `${type}-${nanoid(8)}`;
      const newNode: WorkflowNode = {
        id: nodeId,
        type,
        position,
        data: createDefaultNodeData(type),
      };

      const updated = {
        ...currentWorkflow,
        nodes: [...currentWorkflow.nodes, newNode],
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true, selectedNodes: [nodeId] });
      get().pushHistory();
      scheduleWorkflowValidation(get);
      return nodeId;
    },

    updateNode: (nodeId, data) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        nodes: currentWorkflow.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } as WorkflowNodeData }
            : node
        ),
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });

      const keys = Object.keys(data);
      const isHighFrequencyTextUpdate =
        keys.length > 0 &&
        keys.every(
          (k) =>
            k === 'label' ||
            k === 'text' ||
            k === 'content' ||
            k === 'description' ||
            k === 'title'
        );

      if (isHighFrequencyTextUpdate) {
        scheduleNodeHistoryPush(updated.id);
      } else {
        get().pushHistory();
      }

      scheduleWorkflowValidation(get);
    },

    deleteNode: (nodeId) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        nodes: currentWorkflow.nodes.filter((n) => n.id !== nodeId),
        edges: currentWorkflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        updatedAt: new Date(),
      };

      set({
        currentWorkflow: updated,
        isDirty: true,
        selectedNodes: get().selectedNodes.filter((id) => id !== nodeId),
      });
      get().pushHistory();
      scheduleWorkflowValidation(get);
    },

    deleteNodes: (nodeIds) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const nodeIdSet = new Set(nodeIds);
      const updated = {
        ...currentWorkflow,
        nodes: currentWorkflow.nodes.filter((n) => !nodeIdSet.has(n.id)),
        edges: currentWorkflow.edges.filter(
          (e) => !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)
        ),
        updatedAt: new Date(),
      };

      set({
        currentWorkflow: updated,
        isDirty: true,
        selectedNodes: get().selectedNodes.filter((id) => !nodeIdSet.has(id)),
      });
      get().pushHistory();
      scheduleWorkflowValidation(get);
    },

    duplicateNode: (nodeId) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return null;

      const node = currentWorkflow.nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const newNodeId = `${node.type}-${nanoid(8)}`;
      const newNode: WorkflowNode = {
        ...node,
        id: newNodeId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: { ...node.data },
      };

      const updated = {
        ...currentWorkflow,
        nodes: [...currentWorkflow.nodes, newNode],
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true, selectedNodes: [newNodeId] });
      get().pushHistory();
      scheduleWorkflowValidation(get);
      return newNodeId;
    },

    onNodesChange: (changes: NodeChange<WorkflowNode>[]) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const removedIds = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removedIds.length > 0) {
        get().deleteNodes(removedIds);
        return;
      }

      const updated = {
        ...currentWorkflow,
        nodes: applyNodeChanges(changes, currentWorkflow.nodes),
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });

      const shouldValidate = changes.some((c) => c.type !== 'select');
      if (shouldValidate) {
        scheduleWorkflowValidation(get);
      }
    },
  };
};

export const clearNodeSliceTimers = () => {
  if (nodeHistoryTimer) {
    clearTimeout(nodeHistoryTimer);
    nodeHistoryTimer = undefined;
  }
};
