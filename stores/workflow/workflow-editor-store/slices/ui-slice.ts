/**
 * UI Slice
 * Handles UI state: panels, tabs, search
 */

import type { SliceCreator, UISliceActions, UISliceState } from '../types';

export const uiSliceInitialState: UISliceState = {
  showNodePalette: true,
  showConfigPanel: true,
  showExecutionPanel: false,
  showMinimap: true,
  activeConfigTab: 'properties',
  activeInspectorSection: 'config',
  searchQuery: '',
  recentNodes: [],
  favoriteNodes: [],
  insertionIntent: null,
  executionFocus: null,
};

export const createUISlice: SliceCreator<UISliceActions> = (set) => {
  return {
    toggleNodePalette: () => {
      set((state) => ({ showNodePalette: !state.showNodePalette }));
    },

    toggleConfigPanel: () => {
      set((state) => ({ showConfigPanel: !state.showConfigPanel }));
    },

    toggleExecutionPanel: () => {
      set((state) => ({ showExecutionPanel: !state.showExecutionPanel }));
    },

    toggleMinimap: () => {
      set((state) => ({ showMinimap: !state.showMinimap }));
    },

    setActiveConfigTab: (tab) => {
      set({ activeConfigTab: tab });
    },

    setActiveInspectorSection: (section) => {
      set({ activeInspectorSection: section });
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    addRecentNode: (type) => {
      set((state) => ({
        recentNodes: [type, ...state.recentNodes.filter((t) => t !== type)].slice(0, 8),
      }));
    },

    toggleFavoriteNode: (type) => {
      set((state) => ({
        favoriteNodes: state.favoriteNodes.includes(type)
          ? state.favoriteNodes.filter((t) => t !== type)
          : [...state.favoriteNodes, type],
      }));
    },

    setInsertionIntent: (intent) => {
      set({ insertionIntent: intent });
    },

    clearInsertionIntent: () => {
      set({ insertionIntent: null });
    },

    setExecutionFocus: (focus) => {
      set({ executionFocus: focus });
    },

    clearExecutionFocus: () => {
      set({ executionFocus: null });
    },
  };
};
