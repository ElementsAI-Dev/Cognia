import {
  SelectionConfig,
  SelectionAction,
  SelectionMode,
  TextType,
  SelectionItem,
  ReferenceResource,
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

export type SelectionStore = SelectionState & SelectionActions;
