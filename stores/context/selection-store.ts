import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  SelectionConfig,
  SelectionAction,
  SelectionMode,
  TextType,
  SelectionItem,
  ReferenceResource,
  DEFAULT_SELECTION_CONFIG,
  ToolbarMode,
  ActionGroup,
  ActionGroupConfig,
  ToolbarPreset,
  CustomUserAction,
  SelectionTemplate,
  SearchEngine,
} from '@/types';

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

// Translation memory entry for caching translations
export interface TranslationMemoryEntry {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translation: string;
  timestamp: number;
  usageCount: number;
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
  // Translation memory
  translationMemory: TranslationMemoryEntry[];
}

export interface SelectionActions {
  updateConfig: (config: Partial<SelectionConfig>) => void;
  resetConfig: () => void;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  showToolbar: (
    text: string,
    x: number,
    y: number,
    options?: {
      sourceApp?: string;
      textType?: TextType;
    }
  ) => void;
  hideToolbar: () => void;
  setProcessing: (action: SelectionAction | null) => void;
  setStreaming: (isStreaming: boolean) => void;
  appendStreamingResult: (chunk: string) => void;
  setResult: (result: string | null) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;
  setSelectionMode: (mode: SelectionMode) => void;
  setShowMoreMenu: (show: boolean) => void;
  addToHistory: (item: Omit<SelectionHistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearHistory: () => void;
  exportHistory: () => string;
  importHistory: (json: string) => boolean;
  setFeedback: (actionId: string, positive: boolean) => void;
  // Multi-selection actions
  toggleMultiSelectMode: () => void;
  addSelection: (
    text: string,
    position: { x: number; y: number },
    options?: { sourceApp?: string; textType?: TextType }
  ) => void;
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  getSelectedTexts: () => string[];
  getCombinedText: () => string;
  // Reference actions
  addReference: (resource: Omit<ReferenceResource, 'id'>) => void;
  removeReference: (id: string) => void;
  clearReferences: () => void;
  updateReference: (id: string, updates: Partial<ReferenceResource>) => void;
  // Translation memory actions
  addTranslationMemory: (
    entry: Omit<TranslationMemoryEntry, 'id' | 'timestamp' | 'usageCount'>
  ) => void;
  findTranslationMemory: (
    sourceText: string,
    targetLanguage: string
  ) => TranslationMemoryEntry | null;
  incrementTranslationUsage: (id: string) => void;
  clearTranslationMemory: () => void;
  // Toolbar mode actions
  setToolbarMode: (mode: ToolbarMode) => void;
  toggleToolbarMode: () => void;
  updateQuickActions: (actions: SelectionAction[]) => void;
  toggleActionGroup: (groupId: ActionGroup) => void;
  updateActionGroups: (groups: ActionGroupConfig[]) => void;
  // Preset actions
  savePreset: (preset: Omit<ToolbarPreset, 'id'>) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  // Custom user action actions
  addCustomAction: (action: Omit<CustomUserAction, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  updateCustomAction: (id: string, updates: Partial<CustomUserAction>) => void;
  removeCustomAction: (id: string) => void;
  reorderCustomActions: (ids: string[]) => void;
  incrementCustomActionUsage: (id: string) => void;
  // Template actions (persisted)
  addTemplate: (template: Omit<SelectionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'isBuiltIn' | 'isFavorite'>) => void;
  updateTemplate: (id: string, updates: Partial<SelectionTemplate>) => void;
  removeTemplate: (id: string) => void;
  toggleTemplateFavorite: (id: string) => void;
  incrementTemplateUsage: (id: string) => void;
  importTemplates: (json: string) => boolean;
  exportTemplates: () => string;
  // Usage tracking
  trackActionUsage: (actionId: string) => void;
  getActionUsageCount: (actionId: string) => number;
  // Search engine
  setSearchEngine: (engine: SearchEngine) => void;
  // Replace-in-place
  setEnableReplaceInPlace: (enabled: boolean) => void;
  // Pinned action reorder
  reorderPinnedActions: (actions: SelectionAction[]) => void;
}

type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      config: DEFAULT_SELECTION_CONFIG,
      isEnabled: false,
      isToolbarVisible: false,
      selectedText: '',
      position: { x: 0, y: 0 },
      isProcessing: false,
      isStreaming: false,
      streamingResult: null,
      currentAction: null,
      result: null,
      error: null,
      history: [],
      selectionMode: 'auto',
      textType: null,
      sourceApp: null,
      showMoreMenu: false,
      feedbackGiven: {},
      // Multi-selection
      selections: [],
      isMultiSelectMode: false,
      // References
      references: [],
      // Translation memory
      translationMemory: [],

      // Actions
      updateConfig: (config: Partial<SelectionConfig>) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      resetConfig: () =>
        set({
          config: DEFAULT_SELECTION_CONFIG,
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
          selectedText: '',
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
          streamingResult: isStreaming ? '' : null,
        }),

      appendStreamingResult: (chunk: string) =>
        set((state) => ({
          streamingResult: (state.streamingResult || '') + chunk,
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

      addToHistory: (item: Omit<SelectionHistoryItem, 'id' | 'timestamp'>) =>
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
        return state.selections.map((s) => s.text).join('\n\n---\n\n');
      },

      // Reference actions
      addReference: (resource: Omit<ReferenceResource, 'id'>) =>
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
          references: state.references.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      // Translation memory actions
      addTranslationMemory: (
        entry: Omit<TranslationMemoryEntry, 'id' | 'timestamp' | 'usageCount'>
      ) =>
        set((state) => {
          // Check if similar entry exists (same source text and target language)
          const existingIndex = state.translationMemory.findIndex(
            (tm) =>
              tm.sourceText.toLowerCase() === entry.sourceText.toLowerCase() &&
              tm.targetLanguage === entry.targetLanguage
          );

          if (existingIndex !== -1) {
            // Update existing entry
            const updated = [...state.translationMemory];
            updated[existingIndex] = {
              ...updated[existingIndex],
              translation: entry.translation,
              timestamp: Date.now(),
              usageCount: updated[existingIndex].usageCount + 1,
            };
            return { translationMemory: updated };
          }

          // Add new entry (limit to 500 entries)
          const newEntry: TranslationMemoryEntry = {
            ...entry,
            id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: Date.now(),
            usageCount: 1,
          };
          return {
            translationMemory: [newEntry, ...state.translationMemory.slice(0, 499)],
          };
        }),

      findTranslationMemory: (sourceText: string, targetLanguage: string) => {
        const state = get();
        return (
          state.translationMemory.find(
            (tm) =>
              tm.sourceText.toLowerCase() === sourceText.toLowerCase() &&
              tm.targetLanguage === targetLanguage
          ) || null
        );
      },

      incrementTranslationUsage: (id: string) =>
        set((state) => ({
          translationMemory: state.translationMemory.map((tm) =>
            tm.id === id ? { ...tm, usageCount: tm.usageCount + 1 } : tm
          ),
        })),

      clearTranslationMemory: () =>
        set({
          translationMemory: [],
        }),

      // Toolbar mode actions
      setToolbarMode: (mode: ToolbarMode) =>
        set((state) => ({
          config: { ...state.config, toolbarMode: mode },
        })),

      toggleToolbarMode: () =>
        set((state) => ({
          config: {
            ...state.config,
            toolbarMode: state.config.toolbarMode === 'full' ? 'compact' : 'full',
          },
        })),

      updateQuickActions: (actions: SelectionAction[]) =>
        set((state) => ({
          config: { ...state.config, quickActions: actions },
        })),

      toggleActionGroup: (groupId: ActionGroup) =>
        set((state) => ({
          config: {
            ...state.config,
            actionGroups: state.config.actionGroups.map((g) =>
              g.id === groupId ? { ...g, expanded: !g.expanded } : g
            ),
          },
        })),

      updateActionGroups: (groups: ActionGroupConfig[]) =>
        set((state) => ({
          config: { ...state.config, actionGroups: groups },
        })),

      // Preset actions
      savePreset: (preset: Omit<ToolbarPreset, 'id'>) =>
        set((state) => {
          const newPreset: ToolbarPreset = {
            ...preset,
            id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          };
          return {
            config: {
              ...state.config,
              presets: [...state.config.presets, newPreset],
              activePreset: newPreset.id,
            },
          };
        }),

      loadPreset: (presetId: string) =>
        set((state) => {
          const preset = state.config.presets.find((p) => p.id === presetId);
          if (!preset) return state;
          return {
            config: {
              ...state.config,
              toolbarMode: preset.mode,
              quickActions: preset.quickActions,
              actionGroups: preset.groups,
              activePreset: presetId,
            },
          };
        }),

      deletePreset: (presetId: string) =>
        set((state) => ({
          config: {
            ...state.config,
            presets: state.config.presets.filter((p) => p.id !== presetId),
            activePreset:
              state.config.activePreset === presetId ? null : state.config.activePreset,
          },
        })),

      // Custom user action actions
      addCustomAction: (action) =>
        set((state) => {
          const newAction: CustomUserAction = {
            ...action,
            id: `custom-action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            usageCount: 0,
          };
          return {
            config: {
              ...state.config,
              customUserActions: [...state.config.customUserActions, newAction],
            },
          };
        }),

      updateCustomAction: (id, updates) =>
        set((state) => ({
          config: {
            ...state.config,
            customUserActions: state.config.customUserActions.map((a) =>
              a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
            ),
          },
        })),

      removeCustomAction: (id) =>
        set((state) => ({
          config: {
            ...state.config,
            customUserActions: state.config.customUserActions.filter((a) => a.id !== id),
          },
        })),

      reorderCustomActions: (ids) =>
        set((state) => {
          const actionMap = new Map(state.config.customUserActions.map((a) => [a.id, a]));
          const reordered = ids.map((id) => actionMap.get(id)).filter(Boolean) as CustomUserAction[];
          return {
            config: { ...state.config, customUserActions: reordered },
          };
        }),

      incrementCustomActionUsage: (id) =>
        set((state) => ({
          config: {
            ...state.config,
            customUserActions: state.config.customUserActions.map((a) =>
              a.id === id ? { ...a, usageCount: a.usageCount + 1 } : a
            ),
          },
        })),

      // Template actions (persisted)
      addTemplate: (template) =>
        set((state) => {
          const newTemplate: SelectionTemplate = {
            ...template,
            id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            isFavorite: false,
            usageCount: 0,
            isBuiltIn: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return {
            config: {
              ...state.config,
              templates: [...state.config.templates, newTemplate],
            },
          };
        }),

      updateTemplate: (id, updates) =>
        set((state) => ({
          config: {
            ...state.config,
            templates: state.config.templates.map((t) =>
              t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
            ),
          },
        })),

      removeTemplate: (id) =>
        set((state) => ({
          config: {
            ...state.config,
            templates: state.config.templates.filter((t) => t.id !== id),
          },
        })),

      toggleTemplateFavorite: (id) =>
        set((state) => ({
          config: {
            ...state.config,
            templates: state.config.templates.map((t) =>
              t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
            ),
          },
        })),

      incrementTemplateUsage: (id) =>
        set((state) => ({
          config: {
            ...state.config,
            templates: state.config.templates.map((t) =>
              t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
            ),
          },
        })),

      importTemplates: (json: string) => {
        try {
          const items = JSON.parse(json) as SelectionTemplate[];
          if (Array.isArray(items)) {
            set((state) => {
              const existingIds = new Set(state.config.templates.map((t) => t.id));
              const newTemplates: SelectionTemplate[] = items
                .filter((t) => !existingIds.has(t.id))
                .map((t) => ({ ...t, isBuiltIn: false as const, updatedAt: Date.now() }));
              return {
                config: {
                  ...state.config,
                  templates: [...state.config.templates, ...newTemplates],
                },
              };
            });
            return true;
          }
        } catch {
          // Invalid JSON
        }
        return false;
      },

      exportTemplates: () => {
        const state = get();
        return JSON.stringify(state.config.templates, null, 2);
      },

      // Usage tracking
      trackActionUsage: (actionId: string) =>
        set((state) => ({
          config: {
            ...state.config,
            actionUsageCounts: {
              ...state.config.actionUsageCounts,
              [actionId]: (state.config.actionUsageCounts[actionId] || 0) + 1,
            },
          },
        })),

      getActionUsageCount: (actionId: string) => {
        const state = get();
        return state.config.actionUsageCounts[actionId] || 0;
      },

      // Search engine
      setSearchEngine: (engine: SearchEngine) =>
        set((state) => ({
          config: { ...state.config, searchEngine: engine },
        })),

      // Replace-in-place
      setEnableReplaceInPlace: (enabled: boolean) =>
        set((state) => ({
          config: { ...state.config, enableReplaceInPlace: enabled },
        })),

      // Pinned action reorder
      reorderPinnedActions: (actions: SelectionAction[]) =>
        set((state) => ({
          config: { ...state.config, pinnedActions: actions },
        })),
    }),
    {
      name: 'selection-toolbar-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        isEnabled: state.isEnabled,
        history: state.history.slice(0, 50), // Only persist recent history
        feedbackGiven: state.feedbackGiven,
        translationMemory: state.translationMemory.slice(0, 100), // Persist recent translation memory
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

// Translation memory selectors
export const selectTranslationMemory = (state: SelectionState) => state.translationMemory;
export const selectRecentTranslations = (state: SelectionState, count = 10) =>
  state.translationMemory.slice(0, count);
export const selectMostUsedTranslations = (state: SelectionState, count = 10) =>
  [...state.translationMemory].sort((a, b) => b.usageCount - a.usageCount).slice(0, count);

// Multi-selection selectors
export const selectSelections = (state: SelectionState) => state.selections;
export const selectIsMultiSelectMode = (state: SelectionState) => state.isMultiSelectMode;
export const selectSelectionsCount = (state: SelectionState) => state.selections.length;

// Reference selectors
export const selectReferences = (state: SelectionState) => state.references;
export const selectReferencesCount = (state: SelectionState) => state.references.length;

// Toolbar mode selectors
export const selectToolbarMode = (state: SelectionState) => state.config.toolbarMode;
export const selectQuickActions = (state: SelectionState) => state.config.quickActions;
export const selectActionGroups = (state: SelectionState) => state.config.actionGroups;
export const selectActivePreset = (state: SelectionState) => state.config.activePreset;
export const selectPresets = (state: SelectionState) => state.config.presets;
export const selectIsCompactMode = (state: SelectionState) => state.config.toolbarMode === 'compact';

// Custom user action selectors
export const selectCustomUserActions = (state: SelectionState) => state.config.customUserActions;
export const selectEnabledCustomActions = (state: SelectionState) =>
  state.config.customUserActions.filter((a) => a.enabled);
export const selectCustomActionById = (state: SelectionState, id: string) =>
  state.config.customUserActions.find((a) => a.id === id);

// Template selectors
export const selectTemplates = (state: SelectionState) => state.config.templates;
export const selectFavoriteTemplates = (state: SelectionState) =>
  state.config.templates.filter((t) => t.isFavorite);
export const selectTemplatesByCategory = (state: SelectionState, category: string) =>
  state.config.templates.filter((t) => t.category === category);

// Usage tracking selectors
export const selectActionUsageCounts = (state: SelectionState) => state.config.actionUsageCounts;

// Search engine selector
export const selectSearchEngine = (state: SelectionState) => state.config.searchEngine;

// Replace-in-place selector
export const selectEnableReplaceInPlace = (state: SelectionState) => state.config.enableReplaceInPlace;
