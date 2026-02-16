import { nanoid } from 'nanoid';
import { db } from '@/lib/db/schema';
import type { StoreApi } from 'zustand';
import { storedToDbSummary } from '../adapters';
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

      const dbSummary = storedToDbSummary(summary);
      await db.summaries.add(dbSummary);

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

      const dbSummary = storedToDbSummary(updatedSummary);
      await db.summaries.put(dbSummary);

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
      await db.summaries.delete(id);
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
      await db.summaries.where('sessionId').equals(sessionId).delete();
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
