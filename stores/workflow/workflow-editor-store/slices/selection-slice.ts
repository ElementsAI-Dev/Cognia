/**
 * Selection Slice
 * Handles selection and clipboard operations
 */

import { nanoid } from 'nanoid';
import type { SliceCreator, SelectionSliceActions, SelectionSliceState, WorkflowNode, WorkflowEdge } from '../types';
import { applyWorkflowMutation } from '../utils/mutation';

export const selectionSliceInitialState: SelectionSliceState = {
  selectedNodes: [],
  selectedEdges: [],
  copiedNodes: [],
  copiedEdges: [],
};

export const createSelectionSlice: SliceCreator<SelectionSliceActions> = (set, get) => {
  return {
    selectNodes: (nodeIds) => {
      set({ selectedNodes: nodeIds });
    },

    selectEdges: (edgeIds) => {
      set({ selectedEdges: edgeIds });
    },

    selectAll: () => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      set({
        selectedNodes: currentWorkflow.nodes.map((n) => n.id),
        selectedEdges: currentWorkflow.edges.map((e) => e.id),
      });
    },

    clearSelection: () => {
      set({ selectedNodes: [], selectedEdges: [] });
    },

    copySelection: () => {
      const { currentWorkflow, selectedNodes } = get();
      if (!currentWorkflow) return;

      const nodeIdSet = new Set(selectedNodes);
      const copiedNodes = currentWorkflow.nodes.filter((n) => nodeIdSet.has(n.id));
      // Copy all edges that connect two selected nodes (internal edges)
      const copiedEdges = currentWorkflow.edges.filter(
        (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
      );

      set({ copiedNodes, copiedEdges });
    },

    pasteSelection: (position) => {
      const { currentWorkflow, copiedNodes, copiedEdges } = get();
      if (!currentWorkflow || copiedNodes.length === 0) return;

      const idMap = new Map<string, string>();
      const offset = position || { x: 50, y: 50 };

      const newNodes: WorkflowNode[] = copiedNodes.map((node) => {
        const newId = `${node.type}-${nanoid(8)}`;
        idMap.set(node.id, newId);
        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          },
          data: { ...node.data },
        };
      });

      const newEdges: WorkflowEdge[] = copiedEdges.map((edge) => ({
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
        nodeIds: newNodes.map((node) => node.id),
        edgeIds: newEdges.map((edge) => edge.id),
        metadata: { source: 'clipboard:paste' },
        updateWorkflow: (workflow) => ({
          ...workflow,
          nodes: [...workflow.nodes, ...newNodes],
          edges: [...workflow.edges, ...newEdges],
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedNodes: newNodes.map((node) => node.id),
          selectedEdges: newEdges.map((edge) => edge.id),
        },
        pushHistory: true,
        validate: true,
      });
    },

    cutSelection: () => {
      const { currentWorkflow, selectedNodes, selectedEdges } = get();
      get().copySelection();
      if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        return;
      }

      let edgeIdsToDelete = selectedEdges;
      if (selectedNodes.length > 0 && currentWorkflow && selectedEdges.length > 0) {
        const selectedNodeIds = new Set(selectedNodes);
        const edgeById = new Map(currentWorkflow.edges.map((edge) => [edge.id, edge]));
        edgeIdsToDelete = selectedEdges.filter((edgeId) => {
          const edge = edgeById.get(edgeId);
          if (!edge) return true;
          return !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target);
        });
      }

      if (selectedNodes.length > 0) {
        get().deleteNodes(selectedNodes);
      }
      if (edgeIdsToDelete.length > 0) {
        get().deleteEdges(edgeIdsToDelete);
      }
    },
  };
};
