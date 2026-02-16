import type { StoreApi } from 'zustand';
import type { QuoteStore, QuoteStoreActions } from '../types';

type QuoteStoreSet = StoreApi<QuoteStore>['setState'];
type QuoteStoreGet = StoreApi<QuoteStore>['getState'];
type SelectionSlice = Pick<
  QuoteStoreActions,
  | 'toggleSelectionMode'
  | 'toggleSelect'
  | 'selectAll'
  | 'deselectAll'
  | 'removeSelected'
  | 'getSelectedCount'
>;

export const createSelectionSlice = (set: QuoteStoreSet, get: QuoteStoreGet): SelectionSlice => ({
  toggleSelectionMode: () => {
    set((state) => ({
      isSelectionMode: !state.isSelectionMode,
      selectedIds: new Set<string>(),
    }));
  },

  toggleSelect: (id) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { selectedIds: newSelectedIds };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(state.quotedTexts.map((q) => q.id)),
    }));
  },

  deselectAll: () => {
    set({ selectedIds: new Set<string>() });
  },

  removeSelected: () => {
    set((state) => ({
      quotedTexts: state.quotedTexts.filter((q) => !state.selectedIds.has(q.id)),
      selectedIds: new Set<string>(),
      isSelectionMode: false,
    }));
  },

  getSelectedCount: () => get().selectedIds.size,
});
