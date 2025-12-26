import { create } from "zustand";
import {
  SelectionConfig,
  SelectionAction,
  DEFAULT_CONFIG,
} from "@/components/selection-toolbar/types";

export interface SelectionHistoryItem {
  id: string;
  text: string;
  action: SelectionAction;
  result: string;
  timestamp: number;
}

export interface SelectionState {
  config: SelectionConfig;
  isEnabled: boolean;
  isToolbarVisible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  isProcessing: boolean;
  currentAction: SelectionAction | null;
  result: string | null;
  error: string | null;
  history: SelectionHistoryItem[];
}

export interface SelectionActions {
  updateConfig: (config: Partial<SelectionConfig>) => void;
  resetConfig: () => void;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  showToolbar: (text: string, x: number, y: number) => void;
  hideToolbar: () => void;
  setProcessing: (action: SelectionAction | null) => void;
  setResult: (result: string | null) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;
  addToHistory: (item: Omit<SelectionHistoryItem, "id" | "timestamp">) => void;
  clearHistory: () => void;
}

type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>((set) => ({
  // Initial state
  config: DEFAULT_CONFIG,
  isEnabled: true,
  isToolbarVisible: false,
  selectedText: "",
  position: { x: 0, y: 0 },
  isProcessing: false,
  currentAction: null,
  result: null,
  error: null,
  history: [],

  // Actions
  updateConfig: (config: Partial<SelectionConfig>) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  resetConfig: () =>
    set({
      config: DEFAULT_CONFIG,
    }),

  setEnabled: (enabled: boolean) =>
    set({
      isEnabled: enabled,
    }),

  toggle: () =>
    set((state) => ({
      isEnabled: !state.isEnabled,
    })),

  showToolbar: (text: string, x: number, y: number) =>
    set({
      isToolbarVisible: true,
      selectedText: text,
      position: { x, y },
      result: null,
      error: null,
      currentAction: null,
    }),

  hideToolbar: () =>
    set({
      isToolbarVisible: false,
      selectedText: "",
      result: null,
      error: null,
      currentAction: null,
    }),

  setProcessing: (action: SelectionAction | null) =>
    set({
      isProcessing: action !== null,
      currentAction: action,
    }),

  setResult: (result: string | null) =>
    set({
      result,
      isProcessing: false,
    }),

  setError: (error: string | null) =>
    set({
      error,
      isProcessing: false,
    }),

  clearResult: () =>
    set({
      result: null,
      error: null,
      currentAction: null,
    }),

  addToHistory: (item: Omit<SelectionHistoryItem, "id" | "timestamp">) =>
    set((state) => ({
      history: [
        {
          ...item,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        ...state.history.slice(0, 99),
      ],
    })),

  clearHistory: () =>
    set({
      history: [],
    }),
}));

// Selectors
export const selectConfig = (state: SelectionState) => state.config;
export const selectIsEnabled = (state: SelectionState) => state.isEnabled;
export const selectIsToolbarVisible = (state: SelectionState) => state.isToolbarVisible;
export const selectSelectedText = (state: SelectionState) => state.selectedText;
export const selectIsProcessing = (state: SelectionState) => state.isProcessing;
export const selectResult = (state: SelectionState) => state.result;
export const selectError = (state: SelectionState) => state.error;
export const selectHistory = (state: SelectionState) => state.history;
