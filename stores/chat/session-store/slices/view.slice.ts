import { DEFAULT_FLOW_CANVAS_STATE } from '@/types/chat/flow-chat';
import type { SliceCreator, ViewSliceActions } from '../types';

export const createViewSlice: SliceCreator<ViewSliceActions> = (set, get) => ({
  setViewMode: (sessionId, viewMode) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, viewMode, updatedAt: new Date() } : s
      ),
    })),

  getViewMode: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    return session?.viewMode || 'list';
  },

  updateFlowCanvasState: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              flowCanvasState: {
                ...(s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE),
                ...updates,
              },
              updatedAt: new Date(),
            }
          : s
      ),
    })),

  getFlowCanvasState: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    return session?.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
  },

  updateNodePosition: (sessionId, position) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const currentState = s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
        return {
          ...s,
          flowCanvasState: {
            ...currentState,
            nodePositions: {
              ...currentState.nodePositions,
              [position.messageId]: position,
            },
          },
          updatedAt: new Date(),
        };
      }),
    })),

  updateNodePositions: (sessionId, positions) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const currentState = s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
        const newPositions = { ...currentState.nodePositions };
        for (const pos of positions) {
          newPositions[pos.messageId] = pos;
        }
        return {
          ...s,
          flowCanvasState: {
            ...currentState,
            nodePositions: newPositions,
          },
          updatedAt: new Date(),
        };
      }),
    })),

  toggleNodeCollapse: (sessionId, nodeId) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const currentState = s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
        const collapsedNodeIds = new Set(currentState.collapsedNodeIds);
        if (collapsedNodeIds.has(nodeId)) {
          collapsedNodeIds.delete(nodeId);
        } else {
          collapsedNodeIds.add(nodeId);
        }
        return {
          ...s,
          flowCanvasState: {
            ...currentState,
            collapsedNodeIds: Array.from(collapsedNodeIds),
          },
          updatedAt: new Date(),
        };
      }),
    })),

  setSelectedNodes: (sessionId, nodeIds) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              flowCanvasState: {
                ...(s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE),
                selectedNodeIds: nodeIds,
              },
              updatedAt: new Date(),
            }
          : s
      ),
    })),
});
