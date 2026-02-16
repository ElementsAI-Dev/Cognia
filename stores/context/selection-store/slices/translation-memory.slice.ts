import type { StoreApi } from 'zustand';
import type { TranslationMemoryEntry, SelectionStore } from '../types';

type SelectionStoreSet = StoreApi<SelectionStore>['setState'];
type SelectionStoreGet = StoreApi<SelectionStore>['getState'];

type TranslationMemorySlice = Pick<
  SelectionStore,
  | 'addTranslationMemory'
  | 'findTranslationMemory'
  | 'incrementTranslationUsage'
  | 'clearTranslationMemory'
>;

export const createTranslationMemorySlice = (
  set: SelectionStoreSet,
  get: SelectionStoreGet
): TranslationMemorySlice => ({
  addTranslationMemory: (entry) =>
    set((state) => {
      // Check if similar entry exists (same source text and target language)
      const existingIndex = state.translationMemory.findIndex(
        (tm) =>
          tm.sourceText.toLowerCase() === entry.sourceText.toLowerCase() &&
          tm.targetLanguage === entry.targetLanguage
      );

      if (existingIndex !== -1) {
        // Update existing entry
        const updated = [...state.translationMemory];
        updated[existingIndex] = {
          ...updated[existingIndex],
          translation: entry.translation,
          timestamp: Date.now(),
          usageCount: updated[existingIndex].usageCount + 1,
        };
        return { translationMemory: updated };
      }

      // Add new entry (limit to 500 entries)
      const newEntry: TranslationMemoryEntry = {
        ...entry,
        id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        usageCount: 1,
      };
      return {
        translationMemory: [newEntry, ...state.translationMemory.slice(0, 499)],
      };
    }),

  findTranslationMemory: (sourceText, targetLanguage) => {
    const state = get();
    return (
      state.translationMemory.find(
        (tm) =>
          tm.sourceText.toLowerCase() === sourceText.toLowerCase() &&
          tm.targetLanguage === targetLanguage
      ) || null
    );
  },

  incrementTranslationUsage: (id) =>
    set((state) => ({
      translationMemory: state.translationMemory.map((tm) =>
        tm.id === id ? { ...tm, usageCount: tm.usageCount + 1 } : tm
      ),
    })),

  clearTranslationMemory: () =>
    set({
      translationMemory: [],
    }),
});

