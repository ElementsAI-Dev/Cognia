/**
 * Edge Slice
 * Handles edge operations: add, update, delete, connect
 */

import {
  applyEdgeChanges,
  addEdge as rfAddEdge,
  reconnectEdge as rfReconnectEdge,
  type EdgeChange,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { nanoid } from 'nanoid';
import type { SliceCreator, EdgeSliceActions, WorkflowEdge } from '../types';
import { applyWorkflowMutation, confirmDestructiveAction } from '../utils/mutation';

export const createEdgeSlice: SliceCreator<EdgeSliceActions> = (set, get) => {
  return {
    addEdge: (connection: Connection) => {
      const newEdge: WorkflowEdge = {
        id: `edge-${nanoid(8)}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'default',
        data: {},
      };

      applyWorkflowMutation({
        set,
        get,
        kind: 'edge:add',
        edgeIds: [newEdge.id],
        metadata: {
          source: newEdge.source,
          target: newEdge.target,
        },
        updateWorkflow: (workflow) => ({
          ...workflow,
          edges: [...workflow.edges, newEdge],
          updatedAt: new Date(),
        }),
        pushHistory: true,
        validate: true,
      });
    },

    updateEdge: (edgeId, data) => {
      applyWorkflowMutation({
        set,
        get,
        kind: 'edge:update',
        edgeIds: [edgeId],
        metadata: { fields: Object.keys(data) },
        updateWorkflow: (workflow) => ({
          ...workflow,
          edges: workflow.edges.map((edge) =>
            edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
          ),
          updatedAt: new Date(),
        }),
        pushHistory: true,
      });
    },

    deleteEdge: (edgeId) => {
      if (!confirmDestructiveAction('Delete this edge connection?')) {
        return;
      }

      applyWorkflowMutation({
        set,
        get,
        kind: 'edge:delete',
        edgeIds: [edgeId],
        updateWorkflow: (workflow) => ({
          ...workflow,
          edges: workflow.edges.filter((edge) => edge.id !== edgeId),
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedEdges: get().selectedEdges.filter((id) => id !== edgeId),
        },
        pushHistory: true,
        validate: true,
      });
    },

    deleteEdges: (edgeIds) => {
      if (edgeIds.length === 0) return;

      if (!confirmDestructiveAction(`Delete ${edgeIds.length} selected edge connection(s)?`)) {
        return;
      }

      const edgeIdSet = new Set(edgeIds);
      applyWorkflowMutation({
        set,
        get,
        kind: 'edge:delete-many',
        edgeIds,
        updateWorkflow: (workflow) => ({
          ...workflow,
          edges: workflow.edges.filter((edge) => !edgeIdSet.has(edge.id)),
          updatedAt: new Date(),
        }),
        selectionPatch: {
          selectedEdges: get().selectedEdges.filter((id) => !edgeIdSet.has(id)),
        },
        pushHistory: true,
        validate: true,
      });
    },

    reconnectEdge: (oldEdge, newConnection) => {
      applyWorkflowMutation({
        set,
        get,
        kind: 'edge:reconnect',
        edgeIds: [oldEdge.id],
        metadata: {
          source: newConnection.source,
          target: newConnection.target,
        },
        updateWorkflow: (workflow) => ({
          ...workflow,
          edges: rfReconnectEdge(
            oldEdge as Edge,
            newConnection,
            workflow.edges as Edge[]
          ) as WorkflowEdge[],
          updatedAt: new Date(),
        }),
        pushHistory: true,
        validate: true,
      });
    },

    onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const removedIds = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removedIds.length > 0) {
        get().deleteEdges(removedIds);
        return;
      }

      const shouldValidate = changes.some((change) => change.type !== 'select');
      applyWorkflowMutation({
        set,
        get,
        kind: 'edge:update',
        edgeIds: changes.flatMap((change) => ('id' in change ? [change.id] : [])),
        metadata: { source: 'reactflow:onEdgesChange' },
        updateWorkflow: (workflow) => ({
          ...workflow,
          edges: applyEdgeChanges(changes, workflow.edges),
          updatedAt: new Date(),
        }),
        validate: shouldValidate,
        clearServerErrors: shouldValidate,
      });

      const shouldRecordHistory = changes.some((c) => c.type !== 'select');
      if (shouldRecordHistory) {
        get().pushHistory();
      }
    },

    onConnect: (connection: Connection) => {
      const newEdgeId = `edge-${nanoid(8)}`;
      applyWorkflowMutation({
        set,
        get,
        kind: 'edge:connect',
        edgeIds: [newEdgeId],
        metadata: {
          source: connection.source,
          target: connection.target,
        },
        updateWorkflow: (workflow) => ({
          ...workflow,
          edges: rfAddEdge(
            {
              ...connection,
              id: newEdgeId,
              type: 'default',
              data: {},
            },
            workflow.edges as never[]
          ) as WorkflowEdge[],
          updatedAt: new Date(),
        }),
        pushHistory: true,
        validate: true,
      });
    },
  };
};
