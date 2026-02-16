import type { StoreApi } from 'zustand';
import type { SelectionStore } from '../types';

type SelectionStoreSet = StoreApi<SelectionStore>['setState'];

type ProcessingSlice = Pick<
  SelectionStore,
  | 'setProcessing'
  | 'setStreaming'
  | 'appendStreamingResult'
  | 'setResult'
  | 'setError'
  | 'clearResult'
>;

export const createProcessingSlice = (set: SelectionStoreSet): ProcessingSlice => ({
  setProcessing: (action) =>
    set({
      isProcessing: action !== null,
      currentAction: action,
      streamingResult: null,
      error: null,
    }),

  setStreaming: (isStreaming) =>
    set({
      isStreaming,
      streamingResult: isStreaming ? '' : null,
    }),

  appendStreamingResult: (chunk) =>
    set((state) => ({
      streamingResult: (state.streamingResult || '') + chunk,
    })),

  setResult: (result) =>
    set({
      result,
      isProcessing: false,
      isStreaming: false,
    }),

  setError: (error) =>
    set({
      error,
      isProcessing: false,
      isStreaming: false,
    }),

  clearResult: () =>
    set({
      result: null,
      streamingResult: null,
      error: null,
      currentAction: null,
    }),
});

