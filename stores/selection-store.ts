import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SelectionConfig,
  SelectionAction,
  SelectionMode,
  TextType,
  SelectionItem,
  ReferenceResource,
  DEFAULT_CONFIG,
} from "@/components/selection-toolbar/types";

export interface SelectionHistoryItem {
  id: string;
  text: string;
  action: SelectionAction;
  result: string;
  timestamp: number;
  sourceApp?: string;
  textType?: TextType;
  isFavorite?: boolean;
}

export interface SelectionState {
  config: SelectionConfig;
  isEnabled: boolean;
  isToolbarVisible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  isProcessing: boolean;
  isStreaming: boolean;
  streamingResult: string | null;
  currentAction: SelectionAction | null;
  result: string | null;
  error: string | null;
  history: SelectionHistoryItem[];
  selectionMode: SelectionMode;
  textType: TextType | null;
  sourceApp: string | null;
  showMoreMenu: boolean;
  feedbackGiven: Record<string, boolean>;
  // Multi-selection support
  selections: SelectionItem[];
  isMultiSelectMode: boolean;
  // Reference resources
  references: ReferenceResource[];
}

export interface SelectionActions {
  updateConfig: (config: Partial<SelectionConfig>) => void;
  resetConfig: () => void;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  showToolbar: (text: string, x: number, y: number, options?: {
    sourceApp?: string;
    textType?: TextType;
  }) => void;
  hideToolbar: () => void;
  setProcessing: (action: SelectionAction | null) => void;
  setStreaming: (isStreaming: boolean) => void;
  appendStreamingResult: (chunk: string) => void;
  setResult: (result: string | null) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;
  setSelectionMode: (mode: SelectionMode) => void;
  setShowMoreMenu: (show: boolean) => void;
  addToHistory: (item: Omit<SelectionHistoryItem, "id" | "timestamp">) => void;
  removeFromHistory: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearHistory: () => void;
  exportHistory: () => string;
  importHistory: (json: string) => boolean;
  setFeedback: (actionId: string, positive: boolean) => void;
  // Multi-selection actions
  toggleMultiSelectMode: () => void;
  addSelection: (text: string, position: { x: number; y: number }, options?: { sourceApp?: string; textType?: TextType }) => void;
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  getSelectedTexts: () => string[];
  getCombinedText: () => string;
  // Reference actions
  addReference: (resource: Omit<ReferenceResource, "id">) => void;
  removeReference: (id: string) => void;
  clearReferences: () => void;
  updateReference: (id: string, updates: Partial<ReferenceResource>) => void;
}

type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      config: DEFAULT_CONFIG,
      isEnabled: true,
      isToolbarVisible: false,
      selectedText: "",
      position: { x: 0, y: 0 },
      isProcessing: false,
      isStreaming: false,
      streamingResult: null,
      currentAction: null,
      result: null,
      error: null,
      history: [],
      selectionMode: "auto",
      textType: null,
      sourceApp: null,
      showMoreMenu: false,
      feedbackGiven: {},
      // Multi-selection
      selections: [],
      isMultiSelectMode: false,
      // References
      references: [],

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

      showToolbar: (text: string, x: number, y: number, options) =>
        set({
          isToolbarVisible: true,
          selectedText: text,
          position: { x, y },
          result: null,
          streamingResult: null,
          error: null,
          currentAction: null,
          isProcessing: false,
          isStreaming: false,
          showMoreMenu: false,
          sourceApp: options?.sourceApp || null,
          textType: options?.textType || null,
        }),

      hideToolbar: () =>
        set({
          isToolbarVisible: false,
          selectedText: "",
          result: null,
          streamingResult: null,
          error: null,
          currentAction: null,
          isProcessing: false,
          isStreaming: false,
          showMoreMenu: false,
        }),

      setProcessing: (action: SelectionAction | null) =>
        set({
          isProcessing: action !== null,
          currentAction: action,
          streamingResult: null,
          error: null,
        }),

      setStreaming: (isStreaming: boolean) =>
        set({
          isStreaming,
          streamingResult: isStreaming ? "" : null,
        }),

      appendStreamingResult: (chunk: string) =>
        set((state) => ({
          streamingResult: (state.streamingResult || "") + chunk,
        })),

      setResult: (result: string | null) =>
        set({
          result,
          isProcessing: false,
          isStreaming: false,
        }),

      setError: (error: string | null) =>
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

      setSelectionMode: (mode: SelectionMode) =>
        set({
          selectionMode: mode,
        }),

      setShowMoreMenu: (show: boolean) =>
        set({
          showMoreMenu: show,
        }),

      addToHistory: (item: Omit<SelectionHistoryItem, "id" | "timestamp">) =>
        set((state) => ({
          history: [
            {
              ...item,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            },
            ...state.history.slice(0, 199), // Keep more history
          ],
        })),

      removeFromHistory: (id: string) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),

      toggleFavorite: (id: string) =>
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          ),
        })),

      clearHistory: () =>
        set({
          history: [],
        }),

      exportHistory: () => {
        const state = get();
        return JSON.stringify(state.history, null, 2);
      },

      importHistory: (json: string) => {
        try {
          const items = JSON.parse(json) as SelectionHistoryItem[];
          if (Array.isArray(items)) {
            set((state) => ({
              history: [...items, ...state.history].slice(0, 200),
            }));
            return true;
          }
        } catch {
          // Invalid JSON
        }
        return false;
      },

      setFeedback: (actionId: string, positive: boolean) =>
        set((state) => ({
          feedbackGiven: {
            ...state.feedbackGiven,
            [actionId]: positive,
          },
        })),

      // Multi-selection actions
      toggleMultiSelectMode: () =>
        set((state) => ({
          isMultiSelectMode: !state.isMultiSelectMode,
          selections: state.isMultiSelectMode ? [] : state.selections,
        })),

      addSelection: (text: string, position: { x: number; y: number }, options) =>
        set((state) => {
          // Avoid duplicates
          if (state.selections.some((s) => s.text === text)) {
            return state;
          }
          const newSelection: SelectionItem = {
            id: `sel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            text,
            position,
            timestamp: Date.now(),
            sourceApp: options?.sourceApp,
            textType: options?.textType,
          };
          return {
            selections: [...state.selections, newSelection],
          };
        }),

      removeSelection: (id: string) =>
        set((state) => ({
          selections: state.selections.filter((s) => s.id !== id),
        })),

      clearSelections: () =>
        set({
          selections: [],
          isMultiSelectMode: false,
        }),

      getSelectedTexts: () => {
        const state = get();
        return state.selections.map((s) => s.text);
      },

      getCombinedText: () => {
        const state = get();
        if (state.selections.length === 0) {
          return state.selectedText;
        }
        return state.selections.map((s) => s.text).join("\n\n---\n\n");
      },

      // Reference actions
      addReference: (resource: Omit<ReferenceResource, "id">) =>
        set((state) => {
          const newRef: ReferenceResource = {
            ...resource,
            id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          };
          return {
            references: [...state.references, newRef],
          };
        }),

      removeReference: (id: string) =>
        set((state) => ({
          references: state.references.filter((r) => r.id !== id),
        })),

      clearReferences: () =>
        set({
          references: [],
        }),

      updateReference: (id: string, updates: Partial<ReferenceResource>) =>
        set((state) => ({
          references: state.references.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
    }),
    {
      name: "selection-toolbar-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        isEnabled: state.isEnabled,
        history: state.history.slice(0, 50), // Only persist recent history
        feedbackGiven: state.feedbackGiven,
      }),
    }
  )
);

// Selectors
export const selectConfig = (state: SelectionState) => state.config;
export const selectIsEnabled = (state: SelectionState) => state.isEnabled;
export const selectIsToolbarVisible = (state: SelectionState) => state.isToolbarVisible;
export const selectSelectedText = (state: SelectionState) => state.selectedText;
export const selectIsProcessing = (state: SelectionState) => state.isProcessing;
export const selectIsStreaming = (state: SelectionState) => state.isStreaming;
export const selectStreamingResult = (state: SelectionState) => state.streamingResult;
export const selectResult = (state: SelectionState) => state.result;
export const selectError = (state: SelectionState) => state.error;
export const selectHistory = (state: SelectionState) => state.history;
export const selectSelectionMode = (state: SelectionState) => state.selectionMode;

// Computed selectors
export const selectFavoriteHistory = (state: SelectionState) =>
  state.history.filter((item) => item.isFavorite);

export const selectRecentHistory = (state: SelectionState, count = 10) =>
  state.history.slice(0, count);

export const selectHistoryByAction = (state: SelectionState, action: SelectionAction) =>
  state.history.filter((item) => item.action === action);

// Multi-selection selectors
export const selectSelections = (state: SelectionState) => state.selections;
export const selectIsMultiSelectMode = (state: SelectionState) => state.isMultiSelectMode;
export const selectSelectionsCount = (state: SelectionState) => state.selections.length;

// Reference selectors
export const selectReferences = (state: SelectionState) => state.references;
export const selectReferencesCount = (state: SelectionState) => state.references.length;
