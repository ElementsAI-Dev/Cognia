import type { ContextStore } from './types';

export const selectContext = (state: ContextStore) => state.context;
export const selectWindow = (state: ContextStore) => state.window;
export const selectApp = (state: ContextStore) => state.app;
export const selectFile = (state: ContextStore) => state.file;
export const selectBrowser = (state: ContextStore) => state.browser;
export const selectEditor = (state: ContextStore) => state.editor;
export const selectUiElements = (state: ContextStore) => state.uiElements;
export const selectScreenContent = (state: ContextStore) => state.screenContent;
export const selectIsAnalyzingScreen = (state: ContextStore) => state.isAnalyzingScreen;
export const selectScreenAnalysisError = (state: ContextStore) => state.screenAnalysisError;
export const selectLastScreenAnalysisAt = (state: ContextStore) => state.lastScreenAnalysisAt;
export const selectIsLoading = (state: ContextStore) => state.isLoading;
export const selectError = (state: ContextStore) => state.error;
export const selectAutoRefreshEnabled = (state: ContextStore) => state.autoRefreshEnabled;
export const selectRefreshIntervalMs = (state: ContextStore) => state.refreshIntervalMs;
export const selectCacheDurationMs = (state: ContextStore) => state.cacheDurationMs;

