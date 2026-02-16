import type {
  StoredSummary,
  AutoSummaryConfig,
  SummaryStats,
  SummaryFormat,
  SummaryStyle,
  SummaryTemplate,
  DiagramType,
} from '@/types/learning/summary';

export interface SummaryStoreState {
  autoSummaryConfig: AutoSummaryConfig;
  currentSessionId: string | null;
  summaries: StoredSummary[];
  isLoading: boolean;
  error: string | null;
}

export interface SummaryStoreActions {
  setCurrentSession: (sessionId: string | null) => void;
  loadSummariesForSession: (sessionId: string) => Promise<void>;
  createSummary: (
    summary: Omit<StoredSummary, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<StoredSummary>;
  updateSummary: (id: string, updates: Partial<StoredSummary>) => Promise<void>;
  deleteSummary: (id: string) => Promise<void>;
  deleteAllSummariesForSession: (sessionId: string) => Promise<void>;
  getSummary: (id: string) => StoredSummary | undefined;
  getSummariesForSession: (sessionId: string) => StoredSummary[];
  getLatestSummary: (sessionId: string) => StoredSummary | undefined;
  getSummaryStats: (sessionId: string) => SummaryStats;
  updateAutoSummaryConfig: (config: Partial<AutoSummaryConfig>) => void;
  shouldSuggestSummary: (messageCount: number, tokenCount: number) => boolean;
  clearError: () => void;
  reset: () => void;
}

export type SummaryStore = SummaryStoreState & SummaryStoreActions;

export type {
  StoredSummary,
  AutoSummaryConfig,
  SummaryStats,
  SummaryFormat,
  SummaryStyle,
  SummaryTemplate,
  DiagramType,
};
