import type { AutoSummaryConfig, SummaryStoreState } from './types';

export const DEFAULT_CONFIG: AutoSummaryConfig = {
  enabled: true,
  minMessages: 20,
  minTokens: 5000,
  autoOnSessionEnd: false,
  defaultFormat: 'bullets',
  defaultStyle: 'concise',
};

export const initialState: SummaryStoreState = {
  autoSummaryConfig: DEFAULT_CONFIG,
  currentSessionId: null,
  summaries: [],
  isLoading: false,
  error: null,
};
