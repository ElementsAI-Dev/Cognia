export type SelectionAction = 
  | "explain"
  | "translate"
  | "extract"
  | "summarize"
  | "define"
  | "rewrite"
  | "grammar"
  | "copy"
  | "send-to-chat";

export interface ToolbarState {
  isVisible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  isLoading: boolean;
  activeAction: SelectionAction | null;
  result: string | null;
  error: string | null;
}

export interface SelectionPayload {
  text: string;
  x: number;
  y: number;
  timestamp?: number;
}

export interface SelectionConfig {
  enabled: boolean;
  triggerMode: "auto" | "shortcut";
  minTextLength: number;
  maxTextLength: number;
  delayMs: number;
  targetLanguage: string;
  excludedApps: string[];
}

export const DEFAULT_CONFIG: SelectionConfig = {
  enabled: true,
  triggerMode: "auto",
  minTextLength: 1,
  maxTextLength: 5000,
  delayMs: 200,
  targetLanguage: "zh-CN",
  excludedApps: [],
};
