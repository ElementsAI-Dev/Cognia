import { db } from '@/lib/db/schema';
import type { StoreApi } from 'zustand';
import { dbToStoredSummary } from '../adapters';
import type { SummaryStore, SummaryStoreActions } from '../types';

type SummaryStoreSet = StoreApi<SummaryStore>['setState'];
type SummaryStoreGet = StoreApi<SummaryStore>['getState'];
type SessionSlice = Pick<SummaryStoreActions, 'setCurrentSession' | 'loadSummariesForSession'>;

export const createSessionSlice = (set: SummaryStoreSet, get: SummaryStoreGet): SessionSlice => ({
  setCurrentSession: (sessionId) => {
    set({ currentSessionId: sessionId });
    if (sessionId) {
      get().loadSummariesForSession(sessionId);
    } else {
      set({ summaries: [] });
    }
  },

  loadSummariesForSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const dbSummaries = await db.summaries.where('sessionId').equals(sessionId).toArray();

      const summaries = dbSummaries.map(dbToStoredSummary);
      summaries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      set({ summaries, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load summaries',
        isLoading: false,
      });
    }
  },
});
