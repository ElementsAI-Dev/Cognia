/**
 * Designer History Store - persistent storage for designer code history
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export interface DesignerHistoryEntry {
  id: string;
  code: string;
  timestamp: Date;
  label?: string;
  previewImageUrl?: string;
}

interface DesignerHistoryState {
  // History entries per design (keyed by design ID or 'default')
  histories: Record<string, DesignerHistoryEntry[]>;
  
  // Current design ID
  activeDesignId: string;
  
  // Maximum history entries per design
  maxHistoryEntries: number;

  // Actions
  addHistoryEntry: (code: string, label?: string, designId?: string) => void;
  restoreFromHistory: (entryId: string, designId?: string) => DesignerHistoryEntry | null;
  deleteHistoryEntry: (entryId: string, designId?: string) => void;
  clearHistory: (designId?: string) => void;
  setActiveDesignId: (designId: string) => void;
  
  // Selectors
  getHistory: (designId?: string) => DesignerHistoryEntry[];
  getHistoryEntry: (entryId: string, designId?: string) => DesignerHistoryEntry | undefined;
}

const MAX_HISTORY_ENTRIES = 50;

export const useDesignerHistoryStore = create<DesignerHistoryState>()(
  persist(
    (set, get) => ({
      histories: {},
      activeDesignId: 'default',
      maxHistoryEntries: MAX_HISTORY_ENTRIES,

      addHistoryEntry: (code, label, designId) => {
        const id = designId || get().activeDesignId;
        
        set((state) => {
          const currentHistory = state.histories[id] || [];
          
          // Don't add duplicate entries (same code)
          if (currentHistory.length > 0 && currentHistory[0].code === code) {
            return state;
          }
          
          const newEntry: DesignerHistoryEntry = {
            id: nanoid(),
            code,
            timestamp: new Date(),
            label,
          };
          
          // Add new entry at the beginning, limit size
          const updatedHistory = [newEntry, ...currentHistory].slice(0, state.maxHistoryEntries);
          
          return {
            histories: {
              ...state.histories,
              [id]: updatedHistory,
            },
          };
        });
      },

      restoreFromHistory: (entryId, designId) => {
        const id = designId || get().activeDesignId;
        const history = get().histories[id] || [];
        const entry = history.find((e) => e.id === entryId);
        return entry || null;
      },

      deleteHistoryEntry: (entryId, designId) => {
        const id = designId || get().activeDesignId;
        
        set((state) => {
          const currentHistory = state.histories[id] || [];
          const updatedHistory = currentHistory.filter((e) => e.id !== entryId);
          
          return {
            histories: {
              ...state.histories,
              [id]: updatedHistory,
            },
          };
        });
      },

      clearHistory: (designId) => {
        const id = designId || get().activeDesignId;
        
        set((state) => ({
          histories: {
            ...state.histories,
            [id]: [],
          },
        }));
      },

      setActiveDesignId: (designId) => {
        set({ activeDesignId: designId });
      },

      getHistory: (designId) => {
        const id = designId || get().activeDesignId;
        return get().histories[id] || [];
      },

      getHistoryEntry: (entryId, designId) => {
        const id = designId || get().activeDesignId;
        const history = get().histories[id] || [];
        return history.find((e) => e.id === entryId);
      },
    }),
    {
      name: 'cognia-designer-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        histories: Object.fromEntries(
          Object.entries(state.histories).map(([key, entries]) => [
            key,
            entries.map((e) => ({
              ...e,
              timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
            })),
          ])
        ),
        activeDesignId: state.activeDesignId,
        maxHistoryEntries: state.maxHistoryEntries,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.histories) {
          state.histories = Object.fromEntries(
            Object.entries(state.histories).map(([key, entries]) => [
              key,
              entries.map((e) => ({
                ...e,
                timestamp: new Date(e.timestamp),
              })),
            ])
          );
        }
      },
    }
  )
);

export default useDesignerHistoryStore;
