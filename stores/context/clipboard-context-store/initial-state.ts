import type { ClipboardContextState } from './types';

export const initialState: ClipboardContextState = {
  currentContent: null,
  currentAnalysis: null,
  isAnalyzing: false,
  templates: [],
  isMonitoring: false,
  lastUpdateTime: null,
  autoAnalyze: true,
  monitoringInterval: 2000,
  error: null,
};

