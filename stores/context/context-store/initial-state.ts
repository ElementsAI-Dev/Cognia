import type { ContextStoreState } from './types';

export const initialState: ContextStoreState = {
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

