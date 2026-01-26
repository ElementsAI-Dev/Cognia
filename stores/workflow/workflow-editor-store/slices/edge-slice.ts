/**
 * Edge Slice
 * Handles edge operations: add, update, delete, connect
 */

import {
  applyEdgeChanges,
  addEdge as rfAddEdge,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import { nanoid } from 'nanoid';
import type { SliceCreator, EdgeSliceActions, WorkflowEdge } from '../types';

export const createEdgeSlice: SliceCreator<EdgeSliceActions> = (set, get) => {
  return {
    addEdge: (connection: Connection) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const newEdge: WorkflowEdge = {
        id: `edge-${nanoid(8)}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'default',
        data: {},
      };

      const updated = {
        ...currentWorkflow,
        edges: [...currentWorkflow.edges, newEdge],
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      get().pushHistory();
    },

    updateEdge: (edgeId, data) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        edges: currentWorkflow.edges.map((edge) =>
          edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
        ),
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      get().pushHistory();
    },

    deleteEdge: (edgeId) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        edges: currentWorkflow.edges.filter((e) => e.id !== edgeId),
        updatedAt: new Date(),
      };

      set({
        currentWorkflow: updated,
        isDirty: true,
        selectedEdges: get().selectedEdges.filter((id) => id !== edgeId),
      });
      get().pushHistory();
    },

    deleteEdges: (edgeIds) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const edgeIdSet = new Set(edgeIds);
      const updated = {
        ...currentWorkflow,
        edges: currentWorkflow.edges.filter((e) => !edgeIdSet.has(e.id)),
        updatedAt: new Date(),
      };

      set({
        currentWorkflow: updated,
        isDirty: true,
        selectedEdges: get().selectedEdges.filter((id) => !edgeIdSet.has(id)),
      });
      get().pushHistory();
    },

    onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const removedIds = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removedIds.length > 0) {
        get().deleteEdges(removedIds);
        return;
      }

      const updated = {
        ...currentWorkflow,
        edges: applyEdgeChanges(changes, currentWorkflow.edges),
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });

      const shouldRecordHistory = changes.some((c) => c.type !== 'select');
      if (shouldRecordHistory) {
        get().pushHistory();
      }
    },

    onConnect: (connection: Connection) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updated = {
        ...currentWorkflow,
        edges: rfAddEdge(
          {
            ...connection,
            id: `edge-${nanoid(8)}`,
            type: 'default',
            data: {},
          },
          currentWorkflow.edges as never[]
        ) as WorkflowEdge[],
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      get().pushHistory();
    },
  };
};
