/**
 * Summary Store - manages chat summary persistence and state
 *
 * Provides:
 * - CRUD operations for summaries
 * - Session-based summary retrieval
 * - Auto-summary configuration
 * - Summary statistics
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { db, type DBSummary } from '@/lib/db/schema';
import type {
  StoredSummary,
  AutoSummaryConfig,
  SummaryStats,
  SummaryFormat,
  SummaryStyle,
  SummaryTemplate,
  DiagramType,
} from '@/types/learning/summary';

interface SummaryState {
  // Configuration
  autoSummaryConfig: AutoSummaryConfig;

  // Current session state
  currentSessionId: string | null;
  summaries: StoredSummary[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentSession: (sessionId: string | null) => void;
  loadSummariesForSession: (sessionId: string) => Promise<void>;

  // CRUD operations
  createSummary: (
    summary: Omit<StoredSummary, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<StoredSummary>;
  updateSummary: (id: string, updates: Partial<StoredSummary>) => Promise<void>;
  deleteSummary: (id: string) => Promise<void>;
  deleteAllSummariesForSession: (sessionId: string) => Promise<void>;

  // Retrieval
  getSummary: (id: string) => StoredSummary | undefined;
  getSummariesForSession: (sessionId: string) => StoredSummary[];
  getLatestSummary: (sessionId: string) => StoredSummary | undefined;

  // Statistics
  getSummaryStats: (sessionId: string) => SummaryStats;

  // Configuration
  updateAutoSummaryConfig: (config: Partial<AutoSummaryConfig>) => void;
  shouldSuggestSummary: (messageCount: number, tokenCount: number) => boolean;

  // Cleanup
  clearError: () => void;
  reset: () => void;
}

/**
 * Convert DBSummary to StoredSummary
 */
function dbToStoredSummary(dbSummary: DBSummary): StoredSummary {
  return {
    id: dbSummary.id,
    sessionId: dbSummary.sessionId,
    type: dbSummary.type as StoredSummary['type'],
    summary: dbSummary.summary,
    keyPoints: dbSummary.keyPoints ? JSON.parse(dbSummary.keyPoints) : [],
    topics: dbSummary.topics ? JSON.parse(dbSummary.topics) : [],
    diagram: dbSummary.diagram,
    diagramType: dbSummary.diagramType as DiagramType | undefined,
    messageRange: dbSummary.messageRange
      ? JSON.parse(dbSummary.messageRange)
      : { startIndex: 0, endIndex: 0 },
    messageCount: dbSummary.messageCount,
    sourceTokens: dbSummary.sourceTokens,
    summaryTokens: dbSummary.summaryTokens,
    compressionRatio: dbSummary.compressionRatio,
    language: dbSummary.language,
    format: dbSummary.format as SummaryFormat,
    style: dbSummary.style as SummaryStyle | undefined,
    template: dbSummary.template as SummaryTemplate | undefined,
    usedAI: dbSummary.usedAI,
    createdAt: dbSummary.createdAt,
    updatedAt: dbSummary.updatedAt,
  };
}

/**
 * Convert StoredSummary to DBSummary
 */
function storedToDbSummary(summary: StoredSummary): DBSummary {
  return {
    id: summary.id,
    sessionId: summary.sessionId,
    type: summary.type,
    summary: summary.summary,
    keyPoints: JSON.stringify(summary.keyPoints),
    topics: JSON.stringify(summary.topics),
    diagram: summary.diagram,
    diagramType: summary.diagramType,
    messageRange: JSON.stringify(summary.messageRange),
    messageCount: summary.messageCount,
    sourceTokens: summary.sourceTokens,
    summaryTokens: summary.summaryTokens,
    compressionRatio: summary.compressionRatio,
    language: summary.language,
    format: summary.format,
    style: summary.style,
    template: summary.template,
    usedAI: summary.usedAI,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

const DEFAULT_CONFIG: AutoSummaryConfig = {
  enabled: true,
  minMessages: 20,
  minTokens: 5000,
  autoOnSessionEnd: false,
  defaultFormat: 'bullets',
  defaultStyle: 'concise',
};

export const useSummaryStore = create<SummaryState>()(
  persist(
    (set, get) => ({
      // Initial state
      autoSummaryConfig: DEFAULT_CONFIG,
      currentSessionId: null,
      summaries: [],
      isLoading: false,
      error: null,

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

        const totalMessagesSummarized = sessionSummaries.reduce(
          (sum, s) => sum + s.messageCount,
          0
        );
        const avgCompressionRatio =
          sessionSummaries.reduce((sum, s) => sum + s.compressionRatio, 0) /
          sessionSummaries.length;
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

      updateAutoSummaryConfig: (config) => {
        set((state) => ({
          autoSummaryConfig: { ...state.autoSummaryConfig, ...config },
        }));
      },

      shouldSuggestSummary: (messageCount, tokenCount) => {
        const { autoSummaryConfig } = get();
        if (!autoSummaryConfig.enabled) return false;
        return (
          messageCount >= autoSummaryConfig.minMessages || tokenCount >= autoSummaryConfig.minTokens
        );
      },

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          currentSessionId: null,
          summaries: [],
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'summary-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        autoSummaryConfig: state.autoSummaryConfig,
      }),
    }
  )
);

export default useSummaryStore;
