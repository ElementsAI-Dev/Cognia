/**
 * Node Slice
 * Handles node operations: add, update, delete, duplicate
 */

import { applyNodeChanges, type NodeChange } from '@xyflow/react';
import { nanoid } from 'nanoid';
import type { SliceCreator, NodeSliceActions, WorkflowNode, WorkflowNodeData } from '../types';
import { scheduleWorkflowValidation } from '../utils/validation-scheduler';
import { applyWorkflowMutation, confirmDestructiveAction } from '../utils/mutation';
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
      const nodeId = `${type}-${nanoid(8)}`;
      const newNode: WorkflowNode = {
        id: nodeId,
        type,
        position,
        data: createDefaultNodeData(type),
      };

      applyWorkflowMutation({
        set,
        get,
        kind: 'node:add',
        nodeIds: [nodeId],
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: [...workflow.nodes, newNode],
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedNodes: [nodeId],
          selectedEdges: [],
        },
        pushHistory: true,
        validate: true,
      });
      return nodeId;
    },

    updateNode: (nodeId, data) => {
      const updated = applyWorkflowMutation({
        set,
        get,
        kind: 'node:update',
        nodeIds: [nodeId],
        metadata: { fields: Object.keys(data) },
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: workflow.nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } as WorkflowNodeData }
              : node
          ),
          updatedAt: new Date(),
        }),
      });
      if (!updated) return;

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
      if (!confirmDestructiveAction('Delete this node and all connected edges?')) {
        return;
      }

      applyWorkflowMutation({
        set,
        get,
        kind: 'node:delete',
        nodeIds: [nodeId],
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: workflow.nodes.filter((node) => node.id !== nodeId),
          edges: workflow.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedNodes: get().selectedNodes.filter((id) => id !== nodeId),
        },
        pushHistory: true,
        validate: true,
      });
    },

    deleteNodes: (nodeIds) => {
      if (nodeIds.length === 0) return;

      if (
        !confirmDestructiveAction(
          `Delete ${nodeIds.length} selected node(s) and their connected edges?`
        )
      ) {
        return;
      }

      const nodeIdSet = new Set(nodeIds);
      applyWorkflowMutation({
        set,
        get,
        kind: 'node:delete-many',
        nodeIds,
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: workflow.nodes.filter((node) => !nodeIdSet.has(node.id)),
          edges: workflow.edges.filter(
            (edge) => !nodeIdSet.has(edge.source) && !nodeIdSet.has(edge.target)
          ),
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedNodes: get().selectedNodes.filter((id) => !nodeIdSet.has(id)),
        },
        pushHistory: true,
        validate: true,
      });
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

      applyWorkflowMutation({
        set,
        get,
        kind: 'node:duplicate',
        nodeIds: [nodeId, newNodeId],
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: [...workflow.nodes, newNode],
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedNodes: [newNodeId],
          selectedEdges: [],
        },
        pushHistory: true,
        validate: true,
      });
      return newNodeId;
    },

    duplicateNodes: (nodeIds) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow || nodeIds.length === 0) return [];

      const nodeIdSet = new Set(nodeIds);
      const idMap = new Map<string, string>();
      const newNodes: WorkflowNode[] = [];

      // Duplicate each node with offset
      currentWorkflow.nodes
        .filter((n) => nodeIdSet.has(n.id))
        .forEach((node, index) => {
          const newNodeId = `${node.type}-${nanoid(8)}`;
          idMap.set(node.id, newNodeId);
          newNodes.push({
            ...node,
            id: newNodeId,
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50 + index * 10,
            },
            data: { ...node.data },
          });
        });

      // Duplicate internal edges between selected nodes
      const newEdges = currentWorkflow.edges
        .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
        .map((edge) => ({
          ...edge,
          id: `edge-${nanoid(8)}`,
          source: idMap.get(edge.source) || edge.source,
          target: idMap.get(edge.target) || edge.target,
          data: { ...edge.data },
        }));

      applyWorkflowMutation({
        set,
        get,
        kind: 'node:duplicate-many',
        nodeIds: [...nodeIds, ...newNodes.map((node) => node.id)],
        edgeIds: newEdges.map((edge) => edge.id),
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: [...workflow.nodes, ...newNodes],
          edges: [...workflow.edges, ...newEdges],
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedNodes: newNodes.map((node) => node.id),
        },
        pushHistory: true,
        validate: true,
      });
      return newNodes.map((n) => n.id);
    },

    batchUpdateNodes: (nodeIds, data) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow || nodeIds.length === 0) return;

      const nodeIdSet = new Set(nodeIds);
      applyWorkflowMutation({
        set,
        get,
        kind: 'node:batch-update',
        nodeIds,
        metadata: { fields: Object.keys(data) },
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: workflow.nodes.map((node) =>
            nodeIdSet.has(node.id)
              ? { ...node, data: { ...node.data, ...data } as WorkflowNodeData }
              : node
          ),
          updatedAt: new Date(),
        }),
        pushHistory: true,
        validate: true,
      });
    },

    onNodesChange: (changes: NodeChange<WorkflowNode>[]) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const removedIds = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removedIds.length > 0) {
        get().deleteNodes(removedIds);
        return;
      }

      const shouldValidate = changes.some(
        (change) => change.type !== 'select' && change.type !== 'position' && change.type !== 'dimensions'
      );

      applyWorkflowMutation({
        set,
        get,
        kind: 'node:update',
        nodeIds: changes.flatMap((change) => ('id' in change ? [change.id] : [])),
        metadata: { source: 'reactflow:onNodesChange' },
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: applyNodeChanges(changes, workflow.nodes),
          updatedAt: new Date(),
        }),
        clearServerErrors: shouldValidate,
      });

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
