import type { SelectionAction } from '@/types';
import type { SelectionState } from './types';

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

export const selectRecentHistory = (state: SelectionState, count = 10) => state.history.slice(0, count);

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
