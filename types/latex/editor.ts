/**
 * LaTeX Editor Type Definitions
 * Types for the real-time LaTeX editor, preview, and related functionality
 */

// ============================================================================
// Editor State Types
// ============================================================================

export interface LaTeXEditorState {
  /** Current document content */
  content: string;
  /** Cursor position in the editor */
  cursorPosition: CursorPosition;
  /** Current text selection */
  selection?: TextSelection;
  /** Parsing errors */
  errors: LaTeXError[];
  /** Autocomplete suggestions */
  suggestions: LaTeXSuggestion[];
  /** Rendered HTML preview */
  previewHtml: string;
  /** Whether preview is loading */
  isPreviewLoading: boolean;
  /** Document metadata */
  metadata: LaTeXDocumentMetadata;
  /** Undo/redo history */
  history: LaTeXHistoryState;
  /** Current editing mode */
  mode: LaTeXEditMode;
}

export interface CursorPosition {
  line: number;
  column: number;
  offset: number;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
  text: string;
}

export interface LaTeXDocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  documentClass?: string;
  packages: string[];
  bibliography?: string;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  characterCount: number;
}

export interface LaTeXHistoryState {
  undoStack: LaTeXHistoryEntry[];
  redoStack: LaTeXHistoryEntry[];
  maxSize: number;
}

export interface LaTeXHistoryEntry {
  content: string;
  cursorPosition: CursorPosition;
  timestamp: Date;
  description?: string;
}

export type LaTeXEditMode = 'source' | 'visual' | 'split';

// ============================================================================
// Error Types
// ============================================================================

export interface LaTeXError {
  id: string;
  type: LaTeXErrorType;
  severity: LaTeXErrorSeverity;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  source?: string;
  suggestion?: string;
  quickFix?: LaTeXQuickFix;
}

export type LaTeXErrorType =
  | 'syntax'
  | 'undefined-command'
  | 'undefined-environment'
  | 'missing-package'
  | 'unbalanced-braces'
  | 'unbalanced-environment'
  | 'math-error'
  | 'citation-error'
  | 'reference-error'
  | 'warning'
  | 'info';

export type LaTeXErrorSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface LaTeXQuickFix {
  title: string;
  replacement: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

// ============================================================================
// Autocomplete Types
// ============================================================================

export interface LaTeXSuggestion {
  id: string;
  type: LaTeXSuggestionType;
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  snippet?: boolean;
  command?: LaTeXCommand;
  package?: string;
}

export type LaTeXSuggestionType =
  | 'command'
  | 'environment'
  | 'package'
  | 'symbol'
  | 'citation'
  | 'reference'
  | 'file'
  | 'snippet'
  | 'keyword';

export interface LaTeXCommand {
  name: string;
  signature?: string;
  parameters?: LaTeXParameter[];
  description?: string;
  package?: string;
  category?: LaTeXCommandCategory;
  example?: string;
}

export interface LaTeXParameter {
  name: string;
  type: 'required' | 'optional';
  description?: string;
  defaultValue?: string;
  choices?: string[];
}

export type LaTeXCommandCategory =
  | 'math'
  | 'text'
  | 'structure'
  | 'formatting'
  | 'graphics'
  | 'tables'
  | 'bibliography'
  | 'cross-reference'
  | 'document'
  | 'custom';

// ============================================================================
// Symbol Types
// ============================================================================

export interface LaTeXSymbol {
  name: string;
  command: string;
  unicode?: string;
  category: LaTeXSymbolCategory;
  description?: string;
  package?: string;
  mathMode?: boolean;
  textMode?: boolean;
}

export type LaTeXSymbolCategory =
  | 'greek'
  | 'operators'
  | 'relations'
  | 'arrows'
  | 'delimiters'
  | 'accents'
  | 'functions'
  | 'sets'
  | 'logic'
  | 'geometry'
  | 'calculus'
  | 'linear-algebra'
  | 'statistics'
  | 'physics'
  | 'chemistry'
  | 'misc';

// ============================================================================
// Environment Types
// ============================================================================

export interface LaTeXEnvironment {
  name: string;
  description?: string;
  package?: string;
  parameters?: LaTeXParameter[];
  content?: string;
  mathMode?: boolean;
  category?: LaTeXEnvironmentCategory;
}

export type LaTeXEnvironmentCategory =
  | 'math'
  | 'text'
  | 'list'
  | 'table'
  | 'figure'
  | 'code'
  | 'theorem'
  | 'bibliography'
  | 'custom';

// ============================================================================
// Template Types
// ============================================================================

export interface LaTeXTemplate {
  id: string;
  name: string;
  description: string;
  category: LaTeXTemplateCategory;
  content: string;
  packages: string[];
  thumbnail?: string;
  author?: string;
  version?: string;
  tags?: string[];
}

export type LaTeXTemplateCategory =
  | 'article'
  | 'report'
  | 'book'
  | 'thesis'
  | 'presentation'
  | 'letter'
  | 'cv'
  | 'poster'
  | 'exam'
  | 'homework'
  | 'custom';

// ============================================================================
// Export Types
// ============================================================================

export interface LaTeXExportOptions {
  format: LaTeXExportFormat;
  includeImages?: boolean;
  embedFonts?: boolean;
  quality?: 'draft' | 'normal' | 'high';
  pageSize?: string;
  margins?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

export type LaTeXExportFormat =
  | 'pdf'
  | 'dvi'
  | 'ps'
  | 'html'
  | 'docx'
  | 'odt'
  | 'epub'
  | 'tex';

// ============================================================================
// Editor Configuration Types
// ============================================================================

export interface LaTeXEditorConfig {
  /** Theme setting */
  theme: 'light' | 'dark' | 'system';
  /** Font family for editor */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Tab size in spaces */
  tabSize: number;
  /** Use spaces instead of tabs */
  insertSpaces: boolean;
  /** Enable word wrap */
  wordWrap: boolean;
  /** Show line numbers */
  lineNumbers: boolean;
  /** Enable minimap */
  minimap: boolean;
  /** Enable autocomplete */
  autocomplete: boolean;
  /** Enable syntax highlighting */
  syntaxHighlighting: boolean;
  /** Enable bracket matching */
  bracketMatching: boolean;
  /** Enable auto-closing brackets */
  autoClosingBrackets: boolean;
  /** Enable spell checking */
  spellCheck: boolean;
  /** Spell check language */
  spellCheckLanguage: string;
  /** Preview refresh delay in ms */
  previewDelay: number;
  /** Enable live preview */
  livePreview: boolean;
  /** Preview scale */
  previewScale: number;
  /** Sync scroll between editor and preview */
  syncScroll: boolean;
  /** Enable vim mode */
  vimMode: boolean;
  /** Custom keybindings */
  keybindings: LaTeXKeybinding[];
}

export interface LaTeXKeybinding {
  key: string;
  command: string;
  when?: string;
}

export const DEFAULT_LATEX_EDITOR_CONFIG: LaTeXEditorConfig = {
  theme: 'system',
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  fontSize: 14,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: true,
  lineNumbers: true,
  minimap: false,
  autocomplete: true,
  syntaxHighlighting: true,
  bracketMatching: true,
  autoClosingBrackets: true,
  spellCheck: true,
  spellCheckLanguage: 'en',
  previewDelay: 500,
  livePreview: true,
  previewScale: 1,
  syncScroll: true,
  vimMode: false,
  keybindings: [],
};

// ============================================================================
// AI Assistant Types
// ============================================================================

export interface LaTeXAIAssistantInput {
  action: LaTeXAIAction;
  input: string;
  context?: string;
  options?: LaTeXAIOptions;
}

export type LaTeXAIAction =
  | 'generate'       // Generate LaTeX from natural language
  | 'explain'        // Explain LaTeX code
  | 'simplify'       // Simplify complex expressions
  | 'correct'        // Correct errors
  | 'convert'        // Convert between formats
  | 'complete'       // Complete partial code
  | 'refactor'       // Refactor/improve code
  | 'translate'      // Translate to another language
  | 'format'         // Format/beautify code
  | 'verify'         // Verify mathematical correctness
  | 'expand'         // Expand macros/abbreviations
  | 'optimize';      // Optimize for compilation

export interface LaTeXAIOptions {
  outputFormat?: 'latex' | 'mathml' | 'unicode' | 'ascii';
  style?: 'academic' | 'casual' | 'technical';
  verbosity?: 'brief' | 'detailed' | 'comprehensive';
  targetAudience?: 'expert' | 'student' | 'general';
  includeExplanation?: boolean;
  preserveFormatting?: boolean;
  language?: string;
}

export interface LaTeXAIResult {
  success: boolean;
  output: string;
  explanation?: string;
  alternatives?: string[];
  warnings?: string[];
  suggestions?: string[];
  confidence?: number;
  processingTime?: number;
}

// ============================================================================
// Voice Input Types
// ============================================================================

export interface VoiceToLaTeXConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  mathVocabulary: boolean;
  autoCapitalize: boolean;
  autoPunctuation: boolean;
}

export interface VoiceToLaTeXResult {
  transcript: string;
  latex: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: {
    transcript: string;
    latex: string;
    confidence: number;
  }[];
}

export const DEFAULT_VOICE_CONFIG: VoiceToLaTeXConfig = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  mathVocabulary: true,
  autoCapitalize: true,
  autoPunctuation: true,
};

// ============================================================================
// Sketch Recognition Types
// ============================================================================

export interface SketchToLaTeXInput {
  imageData: string; // Base64 encoded image
  format: 'png' | 'jpeg' | 'svg';
  hints?: string[];
  context?: string;
}

export interface SketchToLaTeXResult {
  success: boolean;
  latex: string;
  confidence: number;
  boundingBoxes?: SketchBoundingBox[];
  alternatives?: {
    latex: string;
    confidence: number;
  }[];
  error?: string;
}

export interface SketchBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  latex: string;
}

// ============================================================================
// Version Control Types
// ============================================================================

export interface LaTeXVersionEntry {
  id: string;
  version: number;
  content: string;
  message?: string;
  author?: string;
  timestamp: Date;
  parentId?: string;
  tags?: string[];
  diff?: LaTeXDiff;
}

export interface LaTeXDiff {
  additions: number;
  deletions: number;
  changes: LaTeXDiffChange[];
}

export interface LaTeXDiffChange {
  type: 'add' | 'delete' | 'modify';
  startLine: number;
  endLine: number;
  oldContent?: string;
  newContent?: string;
}

// ============================================================================
// Collaboration Types
// ============================================================================

export interface LaTeXCollaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursorPosition?: CursorPosition;
  selection?: TextSelection;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface LaTeXComment {
  id: string;
  authorId: string;
  content: string;
  position: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  resolved: boolean;
  replies: LaTeXCommentReply[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LaTeXCommentReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}
