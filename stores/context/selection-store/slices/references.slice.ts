import type { StoreApi } from 'zustand';
import type { ReferenceResource } from '@/types';
import type { SelectionStore } from '../types';

type SelectionStoreSet = StoreApi<SelectionStore>['setState'];

type ReferencesSlice = Pick<
  SelectionStore,
  'addReference' | 'removeReference' | 'clearReferences' | 'updateReference'
>;

export const createReferencesSlice = (set: SelectionStoreSet): ReferencesSlice => ({
  addReference: (resource) =>
    set((state) => {
      const newRef: ReferenceResource = {
        ...resource,
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };
      return {
        references: [...state.references, newRef],
      };
    }),

  removeReference: (id) =>
    set((state) => ({
      references: state.references.filter((r) => r.id !== id),
    })),

  clearReferences: () =>
    set({
      references: [],
    }),

  updateReference: (id, updates) =>
    set((state) => ({
      references: state.references.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
});

