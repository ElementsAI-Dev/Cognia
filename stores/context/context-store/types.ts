import type {
  FullContext,
  WindowInfo,
  AppContext,
  FileContext,
  BrowserContext,
  EditorContext,
  ScreenContent,
  UiElement,
} from '@/lib/native/context';

/** Timestamped context snapshot stored in history */
export interface ContextSnapshot {
  context: FullContext;
  timestamp: number;
}

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
  screenContent: ScreenContent | null;
  isAnalyzingScreen: boolean;
  screenAnalysisError: string | null;
  lastScreenAnalysisAt: number | null;

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
  setScreenContent: (content: ScreenContent | null) => void;
  setIsAnalyzingScreen: (isAnalyzing: boolean) => void;
  setScreenAnalysisError: (error: string | null) => void;
  clearScreenAnalysis: () => void;

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

