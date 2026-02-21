import { nanoid } from 'nanoid';
import type { StoreApi } from 'zustand';
import { unifiedPersistenceService } from '@/lib/storage/persistence/unified-persistence-service';
import type { StoredSummary, SummaryStore, SummaryStoreActions } from '../types';

type SummaryStoreSet = StoreApi<SummaryStore>['setState'];
type SummaryStoreGet = StoreApi<SummaryStore>['getState'];
type CrudSlice = Pick<
  SummaryStoreActions,
  'createSummary' | 'updateSummary' | 'deleteSummary' | 'deleteAllSummariesForSession'
>;

export const createCrudSlice = (set: SummaryStoreSet, get: SummaryStoreGet): CrudSlice => ({
  createSummary: async (summaryInput) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const summary: StoredSummary = {
        ...summaryInput,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
      };

      await unifiedPersistenceService.summaries.upsert(summary);

      set((state) => ({
        summaries: [summary, ...state.summaries],
        isLoading: false,
      }));

      return summary;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create summary',
        isLoading: false,
      });
      throw error;
    }
  },

  updateSummary: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const existingSummary = get().summaries.find((s) => s.id === id);
      if (!existingSummary) {
        throw new Error('Summary not found');
      }

      const updatedSummary: StoredSummary = {
        ...existingSummary,
        ...updates,
        updatedAt: new Date(),
      };

      await unifiedPersistenceService.summaries.upsert(updatedSummary);

      set((state) => ({
        summaries: state.summaries.map((s) => (s.id === id ? updatedSummary : s)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update summary',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteSummary: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await unifiedPersistenceService.summaries.remove(id);
      set((state) => ({
        summaries: state.summaries.filter((s) => s.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete summary',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteAllSummariesForSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      await unifiedPersistenceService.summaries.removeBySession(sessionId);
      set((state) => ({
        summaries: state.summaries.filter((s) => s.sessionId !== sessionId),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete summaries',
        isLoading: false,
      });
      throw error;
    }
  },
});
