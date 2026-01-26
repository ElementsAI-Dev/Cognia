/**
 * Debug Slice
 * Handles debug mode and breakpoint management
 */

import type { SliceCreator, DebugSliceActions, DebugSliceState } from '../types';

export const debugSliceInitialState: DebugSliceState = {
  isDebugMode: false,
  breakpoints: new Set<string>(),
  debugStepIndex: -1,
  isPausedAtBreakpoint: false,
};

export const createDebugSlice: SliceCreator<DebugSliceActions> = (set, get) => {
  return {
    toggleDebugMode: () => {
      set((state) => ({
        isDebugMode: !state.isDebugMode,
        debugStepIndex: -1,
        isPausedAtBreakpoint: false,
      }));
    },

    setBreakpoint: (nodeId) => {
      set((state) => {
        const newBreakpoints = new Set(state.breakpoints);
        newBreakpoints.add(nodeId);
        return { breakpoints: newBreakpoints };
      });
    },

    removeBreakpoint: (nodeId) => {
      set((state) => {
        const newBreakpoints = new Set(state.breakpoints);
        newBreakpoints.delete(nodeId);
        return { breakpoints: newBreakpoints };
      });
    },

    clearBreakpoints: () => {
      set({ breakpoints: new Set<string>() });
    },

    stepOver: () => {
      const { executionState, currentWorkflow, isDebugMode, addExecutionLog } = get();
      if (!isDebugMode || !executionState || !currentWorkflow) return;

      // Find next node to execute
      const pendingNodes = currentWorkflow.nodes.filter(
        (n) =>
          n.type !== 'start' &&
          n.type !== 'end' &&
          executionState.nodeStates[n.id]?.status === 'pending'
      );

      if (pendingNodes.length > 0) {
        const nextNode = pendingNodes[0];
        addExecutionLog({
          timestamp: new Date(),
          level: 'info',
          message: `Debug: Stepping to node "${nextNode.data.label}" (${nextNode.id})`,
        });

        set((state) => ({
          debugStepIndex: state.debugStepIndex + 1,
          isPausedAtBreakpoint: false,
        }));
      }
    },

    stepInto: () => {
      // Same as stepOver for now - could be extended for subworkflows
      get().stepOver();
    },

    continueExecution: () => {
      const { isDebugMode, addExecutionLog } = get();
      if (!isDebugMode) return;

      addExecutionLog({
        timestamp: new Date(),
        level: 'info',
        message: 'Debug: Continuing execution until next breakpoint',
      });

      set({
        isPausedAtBreakpoint: false,
      });
    },
  };
};
