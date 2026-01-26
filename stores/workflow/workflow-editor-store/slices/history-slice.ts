/**
 * History Slice
 * Handles undo/redo history management
 */

import type { SliceCreator, HistorySliceActions, HistorySliceState } from '../types';

export const historySliceInitialState: HistorySliceState = {
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

export const createHistorySlice: SliceCreator<HistorySliceActions> = (set, get) => {
  return {
    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex <= 0) return;

      const newIndex = historyIndex - 1;
      set({
        currentWorkflow: history[newIndex],
        historyIndex: newIndex,
        isDirty: true,
      });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;

      const newIndex = historyIndex + 1;
      set({
        currentWorkflow: history[newIndex],
        historyIndex: newIndex,
        isDirty: true,
      });
    },

    pushHistory: () => {
      const { currentWorkflow, history, historyIndex, maxHistorySize } = get();
      if (!currentWorkflow) return;

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ ...currentWorkflow });

      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    clearHistory: () => {
      const { currentWorkflow } = get();
      set({
        history: currentWorkflow ? [currentWorkflow] : [],
        historyIndex: currentWorkflow ? 0 : -1,
      });
    },
  };
};
