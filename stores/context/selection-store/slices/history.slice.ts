import type { StoreApi } from 'zustand';
import type { SelectionHistoryItem, SelectionStore } from '../types';

type SelectionStoreSet = StoreApi<SelectionStore>['setState'];
type SelectionStoreGet = StoreApi<SelectionStore>['getState'];

type HistorySlice = Pick<
  SelectionStore,
  | 'addToHistory'
  | 'removeFromHistory'
  | 'toggleFavorite'
  | 'clearHistory'
  | 'exportHistory'
  | 'importHistory'
  | 'setFeedback'
>;

export const createHistorySlice = (set: SelectionStoreSet, get: SelectionStoreGet): HistorySlice => ({
  addToHistory: (item) =>
    set((state) => ({
      history: [
        {
          ...item,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        ...state.history.slice(0, 199), // Keep more history
      ],
    })),

  removeFromHistory: (id) =>
    set((state) => ({
      history: state.history.filter((item) => item.id !== id),
    })),

  toggleFavorite: (id) =>
    set((state) => ({
      history: state.history.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      ),
    })),

  clearHistory: () =>
    set({
      history: [],
    }),

  exportHistory: () => {
    const state = get();
    return JSON.stringify(state.history, null, 2);
  },

  importHistory: (json) => {
    try {
      const items = JSON.parse(json) as SelectionHistoryItem[];
      if (Array.isArray(items)) {
        set((state) => ({
          history: [...items, ...state.history].slice(0, 200),
        }));
        return true;
      }
    } catch {
      // Invalid JSON
    }
    return false;
  },

  setFeedback: (actionId, positive) =>
    set((state) => ({
      feedbackGiven: {
        ...state.feedbackGiven,
        [actionId]: positive,
      },
    })),
});

