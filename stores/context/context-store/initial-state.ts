import type { ContextStoreState } from './types';

export const initialState: ContextStoreState = {
  context: null,
  window: null,
  app: null,
  file: null,
  browser: null,
  editor: null,
  uiElements: [],
  screenContent: null,
  isAnalyzingScreen: false,
  screenAnalysisError: null,
  lastScreenAnalysisAt: null,
  isLoading: false,
  error: null,
  autoRefreshEnabled: true,
  refreshIntervalMs: 5000,
  cacheDurationMs: 500,
  lastUpdated: null,
  contextHistory: [],
  historyIndex: null,
};

