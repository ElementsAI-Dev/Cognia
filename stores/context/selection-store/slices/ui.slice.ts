import type { StoreApi } from 'zustand';
import type { SelectionStore } from '../types';

type SelectionStoreSet = StoreApi<SelectionStore>['setState'];

type UiSlice = Pick<
  SelectionStore,
  'setEnabled' | 'toggle' | 'showToolbar' | 'hideToolbar' | 'setSelectionMode' | 'setShowMoreMenu'
>;

export const createUiSlice = (set: SelectionStoreSet): UiSlice => ({
  setEnabled: (enabled) =>
    set({
      isEnabled: enabled,
    }),

  toggle: () =>
    set((state) => ({
      isEnabled: !state.isEnabled,
    })),

  showToolbar: (text, x, y, options) =>
    set({
      isToolbarVisible: true,
      selectedText: text,
      position: { x, y },
      result: null,
      streamingResult: null,
      error: null,
      currentAction: null,
      isProcessing: false,
      isStreaming: false,
      showMoreMenu: false,
      sourceApp: options?.sourceApp || null,
      textType: options?.textType || null,
    }),

  hideToolbar: () =>
    set({
      isToolbarVisible: false,
      selectedText: '',
      result: null,
      streamingResult: null,
      error: null,
      currentAction: null,
      isProcessing: false,
      isStreaming: false,
      showMoreMenu: false,
    }),

  setSelectionMode: (mode) =>
    set({
      selectionMode: mode,
    }),

  setShowMoreMenu: (show) =>
    set({
      showMoreMenu: show,
    }),
});

