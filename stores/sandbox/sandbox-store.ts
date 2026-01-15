/**
 * Sandbox Store - Zustand store for managing sandbox execution state
 *
 * Manages state for:
 * - Sandbox availability and configuration
 * - Code execution state
 * - Execution history
 * - Code snippets cache
 * - Session management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SandboxExecutionResult,
  SandboxExecutionRecord,
  CodeSnippet,
  ExecutionSession,
  LanguageStats,
  SandboxStats,
  BackendSandboxConfig,
  RuntimeType,
} from '@/types/system/sandbox';

export interface SandboxExecutionState {
  isExecuting: boolean;
  currentExecutionId: string | null;
  lastResult: SandboxExecutionResult | null;
  error: string | null;
}

export interface SandboxState {
  // Availability and configuration
  isAvailable: boolean;
  isLoading: boolean;
  config: BackendSandboxConfig | null;
  availableRuntimes: RuntimeType[];
  supportedLanguages: string[];
  
  // Current execution state
  execution: SandboxExecutionState;
  
  // History cache (most recent)
  recentExecutions: SandboxExecutionRecord[];
  historyLoading: boolean;
  
  // Snippets cache
  snippets: CodeSnippet[];
  snippetsLoading: boolean;
  
  // Session management
  currentSession: ExecutionSession | null;
  sessions: ExecutionSession[];
  
  // Statistics
  stats: SandboxStats | null;
  languageStats: Record<string, LanguageStats>;
  
  // UI state
  selectedLanguage: string;
  editorCode: string;
  
  // Error state
  lastError: string | null;
}

export interface SandboxActions {
  // Availability
  setAvailable: (available: boolean) => void;
  setLoading: (loading: boolean) => void;
  setConfig: (config: BackendSandboxConfig | null) => void;
  setRuntimes: (runtimes: RuntimeType[]) => void;
  setLanguages: (languages: string[]) => void;
  
  // Execution state
  startExecution: (executionId: string) => void;
  completeExecution: (result: SandboxExecutionResult) => void;
  failExecution: (error: string) => void;
  resetExecution: () => void;
  
  // History
  setRecentExecutions: (executions: SandboxExecutionRecord[]) => void;
  addExecution: (execution: SandboxExecutionRecord) => void;
  removeExecution: (id: string) => void;
  setHistoryLoading: (loading: boolean) => void;
  
  // Snippets
  setSnippets: (snippets: CodeSnippet[]) => void;
  addSnippet: (snippet: CodeSnippet) => void;
  updateSnippet: (id: string, updates: Partial<CodeSnippet>) => void;
  removeSnippet: (id: string) => void;
  setSnippetsLoading: (loading: boolean) => void;
  
  // Sessions
  setCurrentSession: (session: ExecutionSession | null) => void;
  setSessions: (sessions: ExecutionSession[]) => void;
  addSession: (session: ExecutionSession) => void;
  removeSession: (id: string) => void;
  
  // Statistics
  setStats: (stats: SandboxStats | null) => void;
  setLanguageStats: (language: string, stats: LanguageStats) => void;
  
  // UI state
  setSelectedLanguage: (language: string) => void;
  setEditorCode: (code: string) => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Reset
  reset: () => void;
}

const initialExecutionState: SandboxExecutionState = {
  isExecuting: false,
  currentExecutionId: null,
  lastResult: null,
  error: null,
};

const initialState: SandboxState = {
  isAvailable: false,
  isLoading: true,
  config: null,
  availableRuntimes: [],
  supportedLanguages: [],
  execution: initialExecutionState,
  recentExecutions: [],
  historyLoading: false,
  snippets: [],
  snippetsLoading: false,
  currentSession: null,
  sessions: [],
  stats: null,
  languageStats: {},
  selectedLanguage: 'python',
  editorCode: '',
  lastError: null,
};

export const useSandboxStore = create<SandboxState & SandboxActions>()(
  persist(
    (set, _get) => ({
      ...initialState,

      // Availability
      setAvailable: (available) => set({ isAvailable: available }),
      setLoading: (loading) => set({ isLoading: loading }),
      setConfig: (config) => set({ config }),
      setRuntimes: (runtimes) => set({ availableRuntimes: runtimes }),
      setLanguages: (languages) => set({ supportedLanguages: languages }),

      // Execution state
      startExecution: (executionId) =>
        set({
          execution: {
            isExecuting: true,
            currentExecutionId: executionId,
            lastResult: null,
            error: null,
          },
        }),

      completeExecution: (result) =>
        set((state) => ({
          execution: {
            ...state.execution,
            isExecuting: false,
            lastResult: result,
            error: null,
          },
        })),

      failExecution: (error) =>
        set((state) => ({
          execution: {
            ...state.execution,
            isExecuting: false,
            error,
          },
        })),

      resetExecution: () =>
        set({
          execution: initialExecutionState,
        }),

      // History
      setRecentExecutions: (executions) =>
        set({ recentExecutions: executions }),

      addExecution: (execution) =>
        set((state) => ({
          recentExecutions: [execution, ...state.recentExecutions].slice(0, 50),
        })),

      removeExecution: (id) =>
        set((state) => ({
          recentExecutions: state.recentExecutions.filter((e) => e.id !== id),
        })),

      setHistoryLoading: (loading) => set({ historyLoading: loading }),

      // Snippets
      setSnippets: (snippets) => set({ snippets }),

      addSnippet: (snippet) =>
        set((state) => ({
          snippets: [snippet, ...state.snippets],
        })),

      updateSnippet: (id, updates) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      removeSnippet: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        })),

      setSnippetsLoading: (loading) => set({ snippetsLoading: loading }),

      // Sessions
      setCurrentSession: (session) => set({ currentSession: session }),

      setSessions: (sessions) => set({ sessions }),

      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions],
        })),

      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSession:
            state.currentSession?.id === id ? null : state.currentSession,
        })),

      // Statistics
      setStats: (stats) => set({ stats }),

      setLanguageStats: (language, stats) =>
        set((state) => ({
          languageStats: {
            ...state.languageStats,
            [language]: stats,
          },
        })),

      // UI state
      setSelectedLanguage: (language) => set({ selectedLanguage: language }),
      setEditorCode: (code) => set({ editorCode: code }),

      // Error handling
      setError: (error) => set({ lastError: error }),
      clearError: () => set({ lastError: null }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'cognia-sandbox-store',
      partialize: (state) => ({
        selectedLanguage: state.selectedLanguage,
        editorCode: state.editorCode,
      }),
    }
  )
);

// Selectors
export const selectIsExecuting = (state: SandboxState) =>
  state.execution.isExecuting;
export const selectLastResult = (state: SandboxState) =>
  state.execution.lastResult;
export const selectExecutionError = (state: SandboxState) =>
  state.execution.error;
export const selectSandboxConfig = (state: SandboxState) => state.config;
export const selectAvailableRuntimes = (state: SandboxState) =>
  state.availableRuntimes;
export const selectSupportedLanguages = (state: SandboxState) =>
  state.supportedLanguages;
export const selectRecentExecutions = (state: SandboxState) =>
  state.recentExecutions;
export const selectSnippets = (state: SandboxState) => state.snippets;
export const selectCurrentSession = (state: SandboxState) =>
  state.currentSession;
export const selectSandboxStats = (state: SandboxState) => state.stats;
export const selectSelectedLanguage = (state: SandboxState) =>
  state.selectedLanguage;
export const selectEditorCode = (state: SandboxState) => state.editorCode;
