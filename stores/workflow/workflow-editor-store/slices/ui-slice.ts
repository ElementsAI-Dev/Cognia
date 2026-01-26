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
  searchQuery: '',
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

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },
  };
};
