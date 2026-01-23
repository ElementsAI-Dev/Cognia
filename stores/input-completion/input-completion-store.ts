/**
 * Zustand store for input completion state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CompletionConfig,
  CompletionStatus,
  CompletionSuggestion,
  ImeState,
} from '@/types/input-completion';
import { DEFAULT_COMPLETION_CONFIG } from '@/types/input-completion';

interface InputCompletionState {
  /** Whether the completion system is running */
  isRunning: boolean;
  /** Current IME state */
  imeState: ImeState | null;
  /** Current suggestion */
  currentSuggestion: CompletionSuggestion | null;
  /** Configuration */
  config: CompletionConfig;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Statistics */
  stats: {
    totalRequests: number;
    acceptedSuggestions: number;
    dismissedSuggestions: number;
  };
}

interface InputCompletionActions {
  /** Set running state */
  setIsRunning: (isRunning: boolean) => void;
  /** Set IME state */
  setImeState: (imeState: ImeState | null) => void;
  /** Set current suggestion */
  setCurrentSuggestion: (suggestion: CompletionSuggestion | null) => void;
  /** Update configuration */
  updateConfig: (config: Partial<CompletionConfig>) => void;
  /** Set full configuration */
  setConfig: (config: CompletionConfig) => void;
  /** Set loading state */
  setIsLoading: (isLoading: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Update status from backend */
  updateStatus: (status: CompletionStatus) => void;
  /** Increment accepted suggestions count */
  incrementAccepted: () => void;
  /** Increment dismissed suggestions count */
  incrementDismissed: () => void;
  /** Increment total requests count */
  incrementRequests: () => void;
  /** Reset statistics */
  resetStats: () => void;
  /** Reset store to defaults */
  reset: () => void;
}

type InputCompletionStore = InputCompletionState & InputCompletionActions;

const getInitialState = (): InputCompletionState => ({
  isRunning: false,
  imeState: null,
  currentSuggestion: null,
  config: DEFAULT_COMPLETION_CONFIG,
  isLoading: false,
  error: null,
  stats: {
    totalRequests: 0,
    acceptedSuggestions: 0,
    dismissedSuggestions: 0,
  },
});

export const useInputCompletionStore = create<InputCompletionStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setIsRunning: (isRunning) => set({ isRunning }),

      setImeState: (imeState) => set({ imeState }),

      setCurrentSuggestion: (currentSuggestion) => set({ currentSuggestion }),

      updateConfig: (partialConfig) =>
        set((state) => ({
          config: { ...state.config, ...partialConfig },
        })),

      setConfig: (config) => set({ config }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      updateStatus: (status) =>
        set({
          isRunning: status.is_running,
          imeState: status.ime_state,
        }),

      incrementAccepted: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            acceptedSuggestions: state.stats.acceptedSuggestions + 1,
          },
        })),

      incrementDismissed: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            dismissedSuggestions: state.stats.dismissedSuggestions + 1,
          },
        })),

      incrementRequests: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            totalRequests: state.stats.totalRequests + 1,
          },
        })),

      resetStats: () =>
        set({
          stats: {
            totalRequests: 0,
            acceptedSuggestions: 0,
            dismissedSuggestions: 0,
          },
        }),

      reset: () => set(getInitialState()),
    }),
    {
      name: 'cognia-input-completion',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        stats: state.stats,
      }),
    }
  )
);
