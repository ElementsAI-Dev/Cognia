/**
 * Viewport Slice
 * Handles viewport and layout operations
 */

import type { Viewport } from '@xyflow/react';
import type { SliceCreator, ViewportSliceActions } from '../types';

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

    autoLayout: () => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      // Simple top-to-bottom layout
      const nodes = [...currentWorkflow.nodes];
      const edges = currentWorkflow.edges;

      // Build adjacency list
      const adjacency = new Map<string, string[]>();
      const inDegree = new Map<string, number>();

      nodes.forEach((n) => {
        adjacency.set(n.id, []);
        inDegree.set(n.id, 0);
      });

      edges.forEach((e) => {
        adjacency.get(e.source)?.push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      });

      // Topological sort with levels
      const levels: string[][] = [];
      const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
      const visited = new Set<string>();

      while (queue.length > 0) {
        const levelNodes: string[] = [];
        const levelSize = queue.length;

        for (let i = 0; i < levelSize; i++) {
          const nodeId = queue.shift()!;
          if (visited.has(nodeId)) continue;
          visited.add(nodeId);
          levelNodes.push(nodeId);

          adjacency.get(nodeId)?.forEach((targetId) => {
            const newDegree = (inDegree.get(targetId) || 0) - 1;
            inDegree.set(targetId, newDegree);
            if (newDegree === 0 && !visited.has(targetId)) {
              queue.push(targetId);
            }
          });
        }

        if (levelNodes.length > 0) {
          levels.push(levelNodes);
        }
      }

      // Add disconnected nodes (not reached by topological sort) as a final level
      const disconnected = nodes.filter((n) => !visited.has(n.id));
      if (disconnected.length > 0) {
        levels.push(disconnected.map((n) => n.id));
      }

      // Position nodes
      const nodeWidth = 200;
      const nodeHeight = 80;
      const horizontalGap = 50;
      const verticalGap = 100;

      const updatedNodes = nodes.map((node) => {
        const levelIndex = levels.findIndex((level) => level.includes(node.id));
        if (levelIndex === -1) {
          // Fallback: keep original position if somehow still not found
          return node;
        }
        const nodeIndex = levels[levelIndex].indexOf(node.id);
        const levelWidth = levels[levelIndex].length * (nodeWidth + horizontalGap);
        const startX = (800 - levelWidth) / 2;

        return {
          ...node,
          position: {
            x: startX + nodeIndex * (nodeWidth + horizontalGap),
            y: levelIndex * (nodeHeight + verticalGap) + 50,
          },
        };
      });

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
