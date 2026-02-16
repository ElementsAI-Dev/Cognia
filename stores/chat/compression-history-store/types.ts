import type { CompressionHistoryEntry } from '@/types/system/compression';

export interface CompressionHistoryStoreState {
  entries: CompressionHistoryEntry[];
}

export interface CompressionHistoryStoreActions {
  addEntry: (entry: CompressionHistoryEntry) => void;
  getEntriesForSession: (sessionId: string) => CompressionHistoryEntry[];
  getLatestEntry: (sessionId: string) => CompressionHistoryEntry | undefined;
  removeEntry: (entryId: string) => void;
  clearSession: (sessionId: string) => void;
  canUndo: (sessionId: string) => boolean;
  reset: () => void;
}

export type CompressionHistoryStore = CompressionHistoryStoreState & CompressionHistoryStoreActions;
