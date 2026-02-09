/**
 * Compression History Store - manages compression undo history
 *
 * Provides:
 * - Store compressed message snapshots for undo
 * - Per-session history with auto-eviction
 * - Maximum 5 entries per session, 20 total
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CompressionHistoryEntry } from '@/types/system/compression';

const MAX_ENTRIES_PER_SESSION = 5;
const MAX_TOTAL_ENTRIES = 20;

interface CompressionHistoryState {
  entries: CompressionHistoryEntry[];

  // Actions
  addEntry: (entry: CompressionHistoryEntry) => void;
  getEntriesForSession: (sessionId: string) => CompressionHistoryEntry[];
  getLatestEntry: (sessionId: string) => CompressionHistoryEntry | undefined;
  removeEntry: (entryId: string) => void;
  clearSession: (sessionId: string) => void;
  canUndo: (sessionId: string) => boolean;
  reset: () => void;
}

export const useCompressionHistoryStore = create<CompressionHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        set((state) => {
          let entries = [...state.entries, entry];

          // Enforce per-session limit: remove oldest for this session
          const sessionEntries = entries.filter(e => e.sessionId === entry.sessionId);
          if (sessionEntries.length > MAX_ENTRIES_PER_SESSION) {
            const oldest = sessionEntries[0];
            entries = entries.filter(e => e.id !== oldest.id);
          }

          // Enforce total limit: remove oldest globally
          if (entries.length > MAX_TOTAL_ENTRIES) {
            entries = entries.slice(entries.length - MAX_TOTAL_ENTRIES);
          }

          return { entries };
        });
      },

      getEntriesForSession: (sessionId) => {
        return get().entries.filter(e => e.sessionId === sessionId);
      },

      getLatestEntry: (sessionId) => {
        const sessionEntries = get().entries.filter(e => e.sessionId === sessionId);
        if (sessionEntries.length === 0) return undefined;
        return sessionEntries[sessionEntries.length - 1];
      },

      removeEntry: (entryId) => {
        set((state) => ({
          entries: state.entries.filter(e => e.id !== entryId),
        }));
      },

      clearSession: (sessionId) => {
        set((state) => ({
          entries: state.entries.filter(e => e.sessionId !== sessionId),
        }));
      },

      canUndo: (sessionId) => {
        return get().entries.some(e => e.sessionId === sessionId);
      },

      reset: () => set({ entries: [] }),
    }),
    {
      name: 'cognia-compression-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        entries: state.entries,
      }),
    }
  )
);

export default useCompressionHistoryStore;
