import type { StoreApi } from 'zustand';
import type { SummaryStore, SummaryStoreActions } from '../types';

type SummaryStoreGet = StoreApi<SummaryStore>['getState'];
type QuerySlice = Pick<
  SummaryStoreActions,
  'getSummary' | 'getSummariesForSession' | 'getLatestSummary' | 'getSummaryStats'
>;

export const createQuerySlice = (get: SummaryStoreGet): QuerySlice => ({
  getSummary: (id) => {
    return get().summaries.find((s) => s.id === id);
  },

  getSummariesForSession: (sessionId) => {
    return get().summaries.filter((s) => s.sessionId === sessionId);
  },

  getLatestSummary: (sessionId) => {
    const sessionSummaries = get().summaries.filter((s) => s.sessionId === sessionId);
    if (sessionSummaries.length === 0) return undefined;
    return sessionSummaries.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest
    );
  },

  getSummaryStats: (sessionId) => {
    const sessionSummaries = get().summaries.filter((s) => s.sessionId === sessionId);

    if (sessionSummaries.length === 0) {
      return {
        totalSummaries: 0,
        totalMessagesSummarized: 0,
        avgCompressionRatio: 0,
      };
    }

    const totalMessagesSummarized = sessionSummaries.reduce((sum, s) => sum + s.messageCount, 0);
    const avgCompressionRatio =
      sessionSummaries.reduce((sum, s) => sum + s.compressionRatio, 0) / sessionSummaries.length;
    const lastSummaryAt = sessionSummaries.reduce(
      (latest, s) => (s.createdAt > latest ? s.createdAt : latest),
      sessionSummaries[0].createdAt
    );

    return {
      totalSummaries: sessionSummaries.length,
      lastSummaryAt,
      totalMessagesSummarized,
      avgCompressionRatio,
    };
  },
});
