import { LucideIcon } from 'lucide-react';

// Toolbar display mode
export type ToolbarMode = 'full' | 'compact';

// Action grouping for organized layout
export type ActionGroup = 'primary' | 'writing' | 'code' | 'utility';

export type SelectionAction =
  | 'explain'
  | 'translate'
  | 'extract'
  | 'summarize'
  | 'define'
  | 'rewrite'
  | 'grammar'
  | 'copy'
  | 'send-to-chat'
  | 'search'
  | 'code-explain'
  | 'code-optimize'
  | 'tone-formal'
  | 'tone-casual'
  | 'expand'
  | 'shorten'
  | 'knowledge-map';

export type SelectionMode =
  | 'word'
  | 'line'
  | 'sentence'
  | 'paragraph'
  | 'code_block'
  | 'function'
  | 'bracket'
  | 'quote'
  | 'url'
  | 'email'
  | 'file_path'
  | 'auto';

export type ActionCategory = 'ai' | 'edit' | 'code' | 'utility';

export interface ActionDefinition {
  action: SelectionAction;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  category: ActionCategory;
  description?: string;
}

// Action group configuration for collapsible sections
export interface ActionGroupConfig {
  id: ActionGroup;
  expanded: boolean;
  order: number;
}

// Custom action configuration for user preferences
export interface CustomActionConfig {
  action: SelectionAction;
  enabled: boolean;
  order: number;
  group: ActionGroup;
  customShortcut?: string;
}

// User-defined custom action with custom prompt
export interface CustomUserAction {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  icon?: string;
  category: ActionCategory;
  shortcut?: string;
  color?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

// Selection toolbar prompt template for reusable AI operations
export interface SelectionTemplate {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  category: string;
  icon?: string;
  isFavorite: boolean;
  usageCount: number;
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

// Search engine option
export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'baidu' | 'perplexity';

export interface SearchEngineConfig {
  engine: SearchEngine;
  label: string;
  urlTemplate: string;
}

export const SEARCH_ENGINES: SearchEngineConfig[] = [
  { engine: 'google', label: 'Google', urlTemplate: 'https://www.google.com/search?q={{query}}' },
  { engine: 'bing', label: 'Bing', urlTemplate: 'https://www.bing.com/search?q={{query}}' },
  { engine: 'duckduckgo', label: 'DuckDuckGo', urlTemplate: 'https://duckduckgo.com/?q={{query}}' },
  { engine: 'baidu', label: 'Baidu', urlTemplate: 'https://www.baidu.com/s?wd={{query}}' },
  { engine: 'perplexity', label: 'Perplexity', urlTemplate: 'https://www.perplexity.ai/search?q={{query}}' },
];

// Preset for saving toolbar configurations
export interface ToolbarPreset {
  id: string;
  name: string;
  mode: ToolbarMode;
  quickActions: SelectionAction[];
  customActions: CustomActionConfig[];
  groups: ActionGroupConfig[];
}

export type TextType = 'text' | 'code' | 'url' | 'email' | 'path' | 'number' | 'date';

export interface SelectionItem {
  id: string;
  text: string;
  position: { x: number; y: number };
  timestamp: number;
  sourceApp?: string;
  textType?: TextType;
}

export interface ReferenceResource {
  id: string;
  type: 'file' | 'url' | 'clipboard' | 'selection' | 'note';
  title: string;
  content: string;
  preview?: string;
  metadata?: {
    path?: string;
    url?: string;
    mimeType?: string;
    size?: number;
    timestamp?: number;
  };
}

export interface ToolbarState {
  isVisible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  isLoading: boolean;
  activeAction: SelectionAction | null;
  result: string | null;
  error: string | null;
  streamingResult: string | null;
  isStreaming: boolean;
  showMoreMenu: boolean;
  selectionMode: SelectionMode;
  textType: TextType | null;
  selections: SelectionItem[];
  isMultiSelectMode: boolean;
  references: ReferenceResource[];
}

export interface SelectionPayload {
  text: string;
  x: number;
  y: number;
  timestamp?: number;
  sourceApp?: string;
  source_app?: string;
  sourceProcess?: string;
  source_process?: string;
  sourceWindowTitle?: string;
  source_window_title?: string;
  textType?: TextType;
  text_type?: string;
  eventId?: string;
  event_id?: string;
  detectionMode?: 'auto' | 'manual';
  detection_mode?: 'auto' | 'manual';
}

export interface SelectionConfig {
  enabled: boolean;
  triggerMode: 'auto' | 'shortcut' | 'both';
  minTextLength: number;
  maxTextLength: number;
  delayMs: number;
  targetLanguage: string;
  excludedApps: string[];
  theme: 'auto' | 'light' | 'dark' | 'glass';
  position: 'cursor' | 'center' | 'top' | 'bottom';
  showShortcuts: boolean;
  enableStreaming: boolean;
  autoHideDelay: number;
  pinnedActions: SelectionAction[];
  customShortcuts: Record<SelectionAction, string>;
  // Enhanced toolbar fields
  toolbarMode: ToolbarMode;
  quickActions: SelectionAction[];
  actionGroups: ActionGroupConfig[];
  activePreset: string | null;
  presets: ToolbarPreset[];
  // Custom user actions and templates
  customUserActions: CustomUserAction[];
  templates: SelectionTemplate[];
  // Usage tracking for intelligent sorting
  actionUsageCounts: Record<string, number>;
  // Search engine preference
  searchEngine: SearchEngine;
  // Replace-in-place support
  enableReplaceInPlace: boolean;
}

// Default action groups configuration
export const DEFAULT_ACTION_GROUPS: ActionGroupConfig[] = [
  { id: 'primary', expanded: true, order: 0 },
  { id: 'writing', expanded: false, order: 1 },
  { id: 'code', expanded: false, order: 2 },
  { id: 'utility', expanded: false, order: 3 },
];

// Default quick actions for compact mode
export const DEFAULT_QUICK_ACTIONS: SelectionAction[] = [
  'translate',
  'explain',
  'summarize',
  'copy',
];

export const DEFAULT_SELECTION_CONFIG: SelectionConfig = {
  enabled: false,
  triggerMode: 'auto',
  minTextLength: 1,
  maxTextLength: 5000,
  delayMs: 200,
  targetLanguage: 'zh-CN',
  excludedApps: [],
  theme: 'glass',
  position: 'cursor',
  showShortcuts: true,
  enableStreaming: true,
  autoHideDelay: 0,
  pinnedActions: ['explain', 'translate', 'summarize', 'copy', 'send-to-chat'],
  customShortcuts: {
    explain: 'E',
    translate: 'T',
    summarize: 'S',
    copy: 'C',
    'send-to-chat': 'Enter',
    extract: 'K',
    define: 'D',
    rewrite: 'R',
    grammar: 'G',
    search: 'F',
    'code-explain': 'X',
    'code-optimize': 'O',
    'tone-formal': '',
    'tone-casual': '',
    expand: '',
    shorten: '',
    'knowledge-map': 'K',
  },
  // Enhanced toolbar fields
  toolbarMode: 'full',
  quickActions: DEFAULT_QUICK_ACTIONS,
  actionGroups: DEFAULT_ACTION_GROUPS,
  activePreset: null,
  presets: [],
  // Custom user actions and templates
  customUserActions: [],
  templates: [],
  // Usage tracking
  actionUsageCounts: {},
  // Search engine
  searchEngine: 'google',
  // Replace-in-place
  enableReplaceInPlace: false,
};

export interface ToolbarTheme {
  background: string;
  border: string;
  text: string;
  accent: string;
  hover: string;
  active: string;
}

export const TOOLBAR_THEMES: Record<string, ToolbarTheme> = {
  dark: {
    background: 'bg-gray-900/95',
    border: 'border-gray-700/50',
    text: 'text-white',
    accent: 'text-blue-400',
    hover: 'hover:bg-white/10',
    active: 'bg-white/20',
  },
  light: {
    background: 'bg-white/95',
    border: 'border-gray-200',
    text: 'text-gray-900',
    accent: 'text-blue-600',
    hover: 'hover:bg-gray-100',
    active: 'bg-gray-200',
  },
  glass: {
    background: 'bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90',
    border: 'border-white/10',
    text: 'text-white',
    accent: 'text-cyan-400',
    hover: 'hover:bg-white/15',
    active: 'bg-white/25',
  },
};

export const ACTION_LABELS: Record<SelectionAction, string> = {
  explain: 'Explanation',
  translate: 'Translation',
  summarize: 'Summary',
  extract: 'Key Points',
  define: 'Definition',
  rewrite: 'Rewritten',
  grammar: 'Grammar Check',
  copy: 'Copied',
  'send-to-chat': 'Sent',
  search: 'Search Results',
  'code-explain': 'Code Explanation',
  'code-optimize': 'Optimized Code',
  'tone-formal': 'Formal Tone',
  'tone-casual': 'Casual Tone',
  expand: 'Expanded',
  shorten: 'Shortened',
  'knowledge-map': 'Knowledge Map',
};

export const ACTION_SHORT_LABELS: Record<SelectionAction, string> = {
  explain: 'Explain',
  translate: 'Translate',
  summarize: 'Summarize',
  extract: 'Extract',
  define: 'Define',
  rewrite: 'Rewrite',
  grammar: 'Grammar',
  copy: 'Copy',
  'send-to-chat': 'Send to Chat',
  search: 'Search',
  'code-explain': 'Explain Code',
  'code-optimize': 'Optimize',
  'tone-formal': 'Formal',
  'tone-casual': 'Casual',
  expand: 'Expand',
  shorten: 'Shorten',
  'knowledge-map': 'Knowledge Map',
};

export interface LanguageOption {
  value: string;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { value: 'zh-CN', label: 'Chinese (Simplified)', flag: '🇨🇳' },
  { value: 'zh-TW', label: 'Chinese (Traditional)', flag: '🇹🇼' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { value: 'ko', label: 'Korean', flag: '🇰🇷' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'ru', label: 'Russian', flag: '🇷🇺' },
  { value: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'it', label: 'Italian', flag: '🇮🇹' },
  { value: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
  { value: 'th', label: 'Thai', flag: '🇹🇭' },
  { value: 'id', label: 'Indonesian', flag: '🇮🇩' },
];

export function getLanguageName(code: string): string {
  const lang = LANGUAGES.find((l) => l.value === code);
  return lang?.label || 'Chinese (Simplified)';
}
