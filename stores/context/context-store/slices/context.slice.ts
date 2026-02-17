import type { StoreApi } from 'zustand';
import { MAX_CONTEXT_HISTORY } from '../constants';
import type { ContextStore, ContextSnapshot } from '../types';

type ContextStoreSet = StoreApi<ContextStore>['setState'];

type ContextSlice = Pick<
  ContextStore,
  | 'setContext'
  | 'setWindow'
  | 'setApp'
  | 'setFile'
  | 'setBrowser'
  | 'setEditor'
  | 'setUiElements'
  | 'setScreenContent'
  | 'setIsAnalyzingScreen'
  | 'setScreenAnalysisError'
  | 'clearScreenAnalysis'
>;

export const createContextSlice = (set: ContextStoreSet): ContextSlice => ({
  setContext: (context) =>
    set((state) => {
      const now = Date.now();

      // Push to history ring buffer (deduplicate by comparing window title + app name)
      let history = state.contextHistory;
      if (context) {
        const last = history[history.length - 1];
        const isDuplicate =
          last &&
          last.context.window?.title === context.window?.title &&
          last.context.app?.app_name === context.app?.app_name;
        if (!isDuplicate) {
          const entry: ContextSnapshot = { context, timestamp: now };
          history = [...history, entry];
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
  setScreenContent: (screenContent) =>
    set({
      screenContent,
      uiElements: screenContent?.ui_elements ?? [],
      lastScreenAnalysisAt: screenContent ? Date.now() : null,
      screenAnalysisError: null,
    }),
  setIsAnalyzingScreen: (isAnalyzingScreen) => set({ isAnalyzingScreen }),
  setScreenAnalysisError: (screenAnalysisError) => set({ screenAnalysisError }),
  clearScreenAnalysis: () =>
    set({
      screenContent: null,
      uiElements: [],
      isAnalyzingScreen: false,
      screenAnalysisError: null,
      lastScreenAnalysisAt: null,
    }),
});

