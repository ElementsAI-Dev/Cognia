/**
 * Context Store
 *
 * Zustand store for managing context awareness state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FullContext,
  WindowInfo,
  AppContext,
  FileContext,
  BrowserContext,
  EditorContext,
  UiElement,
} from '@/lib/native/context';

/** Timestamped context snapshot stored in history */
export interface ContextSnapshot {
  context: FullContext;
  timestamp: number;
}

/** Maximum number of context snapshots to retain */
const MAX_CONTEXT_HISTORY = 20;

export interface ContextStoreState {
  // Context data
  context: FullContext | null;
  window: WindowInfo | null;
  app: AppContext | null;
  file: FileContext | null;
  browser: BrowserContext | null;
  editor: EditorContext | null;

  // UI elements from screen analysis
  uiElements: UiElement[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Configuration
  autoRefreshEnabled: boolean;
  refreshIntervalMs: number;
  cacheDurationMs: number;

  // Timestamps
  lastUpdated: number | null;

  // Context history
  contextHistory: ContextSnapshot[];
  historyIndex: number | null;
}

export interface ContextStoreActions {
  // Context updates
  setContext: (context: FullContext | null) => void;
  setWindow: (window: WindowInfo | null) => void;
  setApp: (app: AppContext | null) => void;
  setFile: (file: FileContext | null) => void;
  setBrowser: (browser: BrowserContext | null) => void;
  setEditor: (editor: EditorContext | null) => void;
  setUiElements: (elements: UiElement[]) => void;

  // Loading state
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Configuration
  setAutoRefreshEnabled: (enabled: boolean) => void;
  setRefreshIntervalMs: (ms: number) => void;
  setCacheDurationMs: (ms: number) => void;

  // History navigation
  viewHistoryEntry: (index: number) => void;
  viewLatest: () => void;

  // Clear
  clearContext: () => void;
  clearHistory: () => void;
  reset: () => void;
}

export type ContextStore = ContextStoreState & ContextStoreActions;

const initialState: ContextStoreState = {
  context: null,
  window: null,
  app: null,
  file: null,
  browser: null,
  editor: null,
  uiElements: [],
  isLoading: false,
  error: null,
  autoRefreshEnabled: true,
  refreshIntervalMs: 5000,
  cacheDurationMs: 500,
  lastUpdated: null,
  contextHistory: [],
  historyIndex: null,
};

export const useContextStore = create<ContextStore>()(
  persist(
    (set) => ({
      ...initialState,

      setContext: (context) =>
        set((state) => {
          const now = Date.now();
          // Push to history ring buffer (deduplicate by comparing window title)
          let history = state.contextHistory;
          if (context) {
            const last = history[history.length - 1];
            const isDuplicate = last &&
              last.context.window?.title === context.window?.title &&
              last.context.app?.app_name === context.app?.app_name;
            if (!isDuplicate) {
              history = [...history, { context, timestamp: now }];
              if (history.length > MAX_CONTEXT_HISTORY) {
                history = history.slice(-MAX_CONTEXT_HISTORY);
              }
            }
          }
          return {
            context,
            window: context?.window ?? null,
            app: context?.app ?? null,
            file: context?.file ?? null,
            browser: context?.browser ?? null,
            editor: context?.editor ?? null,
            lastUpdated: now,
            contextHistory: history,
            historyIndex: null,
          };
        }),

      setWindow: (window) => set({ window }),
      setApp: (app) => set({ app }),
      setFile: (file) => set({ file }),
      setBrowser: (browser) => set({ browser }),
      setEditor: (editor) => set({ editor }),
      setUiElements: (uiElements) => set({ uiElements }),

      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      setAutoRefreshEnabled: (autoRefreshEnabled) => set({ autoRefreshEnabled }),
      setRefreshIntervalMs: (refreshIntervalMs) => set({ refreshIntervalMs }),
      setCacheDurationMs: (cacheDurationMs) => set({ cacheDurationMs }),

      viewHistoryEntry: (index) =>
        set((state) => {
          const entry = state.contextHistory[index];
          if (!entry) return state;
          return {
            context: entry.context,
            window: entry.context.window ?? null,
            app: entry.context.app ?? null,
            file: entry.context.file ?? null,
            browser: entry.context.browser ?? null,
            editor: entry.context.editor ?? null,
            historyIndex: index,
          };
        }),

      viewLatest: () =>
        set((state) => {
          const last = state.contextHistory[state.contextHistory.length - 1];
          if (!last) return { historyIndex: null };
          return {
            context: last.context,
            window: last.context.window ?? null,
            app: last.context.app ?? null,
            file: last.context.file ?? null,
            browser: last.context.browser ?? null,
            editor: last.context.editor ?? null,
            historyIndex: null,
          };
        }),

      clearContext: () =>
        set({
          context: null,
          window: null,
          app: null,
          file: null,
          browser: null,
          editor: null,
          uiElements: [],
          lastUpdated: null,
        }),

      clearHistory: () => set({ contextHistory: [], historyIndex: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'cognia-context',
      partialize: (state) => ({
        autoRefreshEnabled: state.autoRefreshEnabled,
        refreshIntervalMs: state.refreshIntervalMs,
        cacheDurationMs: state.cacheDurationMs,
      }),
    }
  )
);

// Selectors
export const selectContext = (state: ContextStore) => state.context;
export const selectWindow = (state: ContextStore) => state.window;
export const selectApp = (state: ContextStore) => state.app;
export const selectFile = (state: ContextStore) => state.file;
export const selectBrowser = (state: ContextStore) => state.browser;
export const selectEditor = (state: ContextStore) => state.editor;
export const selectUiElements = (state: ContextStore) => state.uiElements;
export const selectIsLoading = (state: ContextStore) => state.isLoading;
export const selectError = (state: ContextStore) => state.error;
export const selectAutoRefreshEnabled = (state: ContextStore) => state.autoRefreshEnabled;
export const selectRefreshIntervalMs = (state: ContextStore) => state.refreshIntervalMs;
export const selectCacheDurationMs = (state: ContextStore) => state.cacheDurationMs;
