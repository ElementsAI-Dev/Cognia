/**
 * Viewport Slice
 * Handles viewport and layout operations
 */

import type { Viewport } from '@xyflow/react';
import type { SliceCreator, ViewportSliceActions } from '../types';
import { applyDagreLayout } from '@/lib/workflow-editor/layout';

export const createViewportSlice: SliceCreator<ViewportSliceActions> = (set, get) => {
  return {
    setViewport: (viewport: Viewport) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      // Note: Viewport changes are UI state, not content changes.
      // We update the workflow viewport for restoration purposes,
      // but don't set isDirty to avoid triggering auto-save on every pan/zoom.
      set({
        currentWorkflow: {
          ...currentWorkflow,
          viewport,
        },
      });
    },

    fitView: () => {
      // This will be handled by the React Flow component
    },

    autoLayout: (direction?: 'TB' | 'LR' | 'RL' | 'BT') => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const updatedNodes = applyDagreLayout(
        currentWorkflow.nodes,
        currentWorkflow.edges,
        { direction: direction || 'TB' }
      );

      const updated = {
        ...currentWorkflow,
        nodes: updatedNodes,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      get().pushHistory();
    },

    alignNodes: (alignment) => {
      const { currentWorkflow, selectedNodes } = get();
      if (!currentWorkflow || selectedNodes.length < 2) return;

      const selected = currentWorkflow.nodes.filter((n) => selectedNodes.includes(n.id));
      if (selected.length < 2) return;

      let targetValue: number;

      switch (alignment) {
        case 'left':
          targetValue = Math.min(...selected.map((n) => n.position.x));
          break;
        case 'center':
          targetValue = selected.reduce((sum, n) => sum + n.position.x, 0) / selected.length;
          break;
        case 'right':
          targetValue = Math.max(...selected.map((n) => n.position.x));
          break;
        case 'top':
          targetValue = Math.min(...selected.map((n) => n.position.y));
          break;
        case 'middle':
          targetValue = selected.reduce((sum, n) => sum + n.position.y, 0) / selected.length;
          break;
        case 'bottom':
          targetValue = Math.max(...selected.map((n) => n.position.y));
          break;
      }

      const updatedNodes = currentWorkflow.nodes.map((node) => {
        if (!selectedNodes.includes(node.id)) return node;

        const position = { ...node.position };
        if (['left', 'center', 'right'].includes(alignment)) {
          position.x = targetValue;
        } else {
          position.y = targetValue;
        }

        return { ...node, position };
      });

      const updated = {
        ...currentWorkflow,
        nodes: updatedNodes,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      get().pushHistory();
    },

    distributeNodes: (direction) => {
      const { currentWorkflow, selectedNodes } = get();
      if (!currentWorkflow || selectedNodes.length < 3) return;

      const selected = currentWorkflow.nodes
        .filter((n) => selectedNodes.includes(n.id))
        .sort((a, b) =>
          direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y
        );

      if (selected.length < 3) return;

      const first = selected[0];
      const last = selected[selected.length - 1];
      const totalDistance =
        direction === 'horizontal'
          ? last.position.x - first.position.x
          : last.position.y - first.position.y;
      const gap = totalDistance / (selected.length - 1);

      const updatedNodes = currentWorkflow.nodes.map((node) => {
        const index = selected.findIndex((n) => n.id === node.id);
        if (index === -1) return node;

        const position = { ...node.position };
        if (direction === 'horizontal') {
          position.x = first.position.x + index * gap;
        } else {
          position.y = first.position.y + index * gap;
        }

        return { ...node, position };
      });

      const updated = {
        ...currentWorkflow,
        nodes: updatedNodes,
        updatedAt: new Date(),
      };

      set({ currentWorkflow: updated, isDirty: true });
      get().pushHistory();
    },
  };
};
