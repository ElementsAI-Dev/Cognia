import type { ReactNode } from 'react';

/**
 * Rule target configuration for different AI editors
 */
export interface RuleTarget {
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
}

/**
 * Rule template configuration
 */
export interface RuleTemplate {
  label: string;
  content: string;
}

/**
 * Editor variable for template insertion
 */
export interface EditorVariable {
  label: string;
  value: string;
  description: string;
}

/**
 * Monaco Editor theme type
 */
export type EditorTheme = 'vs-dark' | 'light';

/**
 * Props for the main RulesEditor component
 */
export interface RulesEditorProps {
  onSave?: (path: string, content: string) => Promise<void> | void;
  initialContent?: Record<string, string>;
  className?: string;
}

/**
 * State returned by useRulesEditor hook
 */
export interface RulesEditorState {
  // Content state
  activeTab: string;
  contents: Record<string, string>;
  activeContent: string;
  originalContents: Record<string, string>;
  isDirty: boolean;

  // Editor settings
  showPreview: boolean;
  wordWrap: boolean;
  theme: EditorTheme;
  mobileMenuOpen: boolean;

  // History state
  canUndo: boolean;
  canRedo: boolean;

  // Loading states
  isOptimizing: boolean;
  showResetDialog: boolean;

  // Statistics
  charCount: number;
  wordCount: number;
  tokenEstimate: number;
}

/**
 * Actions returned by useRulesEditor hook
 */
export interface RulesEditorActions {
  // Tab management
  setActiveTab: (tabId: string) => void;

  // Content editing
  handleContentChange: (value: string | undefined) => void;
  handleApplyTemplate: (category: string, templateKey: string) => void;
  handleInsertVariable: (variable: string) => void;

  // History actions
  handleUndo: () => void;
  handleRedo: () => void;

  // File operations
  handleSave: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleImport: () => void;
  handleExport: () => void;
  handleReset: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // AI optimization
  handleOptimize: () => Promise<void>;

  // UI toggles
  setShowPreview: (show: boolean) => void;
  setWordWrap: (wrap: boolean) => void;
  setTheme: (theme: EditorTheme) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setShowResetDialog: (show: boolean) => void;
}

/**
 * Complete return type for useRulesEditor hook
 */
export interface UseRulesEditorReturn extends RulesEditorState, RulesEditorActions {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}
