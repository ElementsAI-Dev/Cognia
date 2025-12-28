import { LucideIcon } from "lucide-react";

export type SelectionAction = 
  | "explain"
  | "translate"
  | "extract"
  | "summarize"
  | "define"
  | "rewrite"
  | "grammar"
  | "copy"
  | "send-to-chat"
  | "search"
  | "code-explain"
  | "code-optimize"
  | "tone-formal"
  | "tone-casual"
  | "expand"
  | "shorten";

export type SelectionMode = 
  | "word"
  | "line"
  | "sentence"
  | "paragraph"
  | "code_block"
  | "function"
  | "bracket"
  | "quote"
  | "url"
  | "email"
  | "file_path"
  | "auto";

export type ActionCategory = "ai" | "edit" | "code" | "utility";

export interface ActionDefinition {
  action: SelectionAction;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  category: ActionCategory;
  description?: string;
}

// Single selection item
export interface SelectionItem {
  id: string;
  text: string;
  position: { x: number; y: number };
  timestamp: number;
  sourceApp?: string;
  textType?: TextType;
}

// Reference resource for context
export interface ReferenceResource {
  id: string;
  type: "file" | "url" | "clipboard" | "selection" | "note";
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
  // Multi-selection support
  selections: SelectionItem[];
  isMultiSelectMode: boolean;
  // Reference resources
  references: ReferenceResource[];
}

export type TextType = "text" | "code" | "url" | "email" | "path" | "number" | "date";

export interface SelectionPayload {
  text: string;
  x: number;
  y: number;
  timestamp?: number;
  sourceApp?: string;
  textType?: TextType;
}

export interface SelectionConfig {
  enabled: boolean;
  triggerMode: "auto" | "shortcut" | "both";
  minTextLength: number;
  maxTextLength: number;
  delayMs: number;
  targetLanguage: string;
  excludedApps: string[];
  theme: "auto" | "light" | "dark" | "glass";
  position: "cursor" | "center" | "top" | "bottom";
  showShortcuts: boolean;
  enableStreaming: boolean;
  autoHideDelay: number;
  pinnedActions: SelectionAction[];
  customShortcuts: Record<SelectionAction, string>;
}

export const DEFAULT_CONFIG: SelectionConfig = {
  enabled: true,
  triggerMode: "auto",
  minTextLength: 1,
  maxTextLength: 5000,
  delayMs: 200,
  targetLanguage: "zh-CN",
  excludedApps: [],
  theme: "glass",
  position: "cursor",
  showShortcuts: true,
  enableStreaming: true,
  autoHideDelay: 0,
  pinnedActions: ["explain", "translate", "summarize", "copy", "send-to-chat"],
  customShortcuts: {
    "explain": "E",
    "translate": "T",
    "summarize": "S",
    "copy": "C",
    "send-to-chat": "Enter",
    "extract": "K",
    "define": "D",
    "rewrite": "R",
    "grammar": "G",
    "search": "F",
    "code-explain": "X",
    "code-optimize": "O",
    "tone-formal": "",
    "tone-casual": "",
    "expand": "",
    "shorten": "",
  },
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
    background: "bg-gray-900/95",
    border: "border-gray-700/50",
    text: "text-white",
    accent: "text-blue-400",
    hover: "hover:bg-white/10",
    active: "bg-white/20",
  },
  light: {
    background: "bg-white/95",
    border: "border-gray-200",
    text: "text-gray-900",
    accent: "text-blue-600",
    hover: "hover:bg-gray-100",
    active: "bg-gray-200",
  },
  glass: {
    background: "bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90",
    border: "border-white/10",
    text: "text-white",
    accent: "text-cyan-400",
    hover: "hover:bg-white/15",
    active: "bg-white/25",
  },
};
