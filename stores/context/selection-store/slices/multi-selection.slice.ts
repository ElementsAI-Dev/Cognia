import type { StoreApi } from 'zustand';
import type { SelectionItem } from '@/types';
import type { SelectionStore } from '../types';

type SelectionStoreSet = StoreApi<SelectionStore>['setState'];
type SelectionStoreGet = StoreApi<SelectionStore>['getState'];

type MultiSelectionSlice = Pick<
  SelectionStore,
  | 'toggleMultiSelectMode'
  | 'addSelection'
  | 'removeSelection'
  | 'clearSelections'
  | 'getSelectedTexts'
  | 'getCombinedText'
>;

export const createMultiSelectionSlice = (
  set: SelectionStoreSet,
  get: SelectionStoreGet
): MultiSelectionSlice => ({
  toggleMultiSelectMode: () =>
    set((state) => ({
      isMultiSelectMode: !state.isMultiSelectMode,
      selections: state.isMultiSelectMode ? [] : state.selections,
    })),

  addSelection: (text, position, options) =>
    set((state) => {
      // Avoid duplicates
      if (state.selections.some((s) => s.text === text)) {
        return state;
      }
      const newSelection: SelectionItem = {
        id: `sel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text,
        position,
        timestamp: Date.now(),
        sourceApp: options?.sourceApp,
        textType: options?.textType,
      };
      return {
        selections: [...state.selections, newSelection],
      };
    }),

  removeSelection: (id) =>
    set((state) => ({
      selections: state.selections.filter((s) => s.id !== id),
    })),

  clearSelections: () =>
    set({
      selections: [],
      isMultiSelectMode: false,
    }),

  getSelectedTexts: () => {
    const state = get();
    return state.selections.map((s) => s.text);
  },

  getCombinedText: () => {
    const state = get();
    if (state.selections.length === 0) {
      return state.selectedText;
    }
    return state.selections.map((s) => s.text).join('\n\n---\n\n');
  },
});

