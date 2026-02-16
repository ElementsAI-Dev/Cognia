/** Content category detected from clipboard */
export type ContentCategory =
  | 'PlainText'
  | 'Url'
  | 'Email'
  | 'PhoneNumber'
  | 'FilePath'
  | 'Code'
  | 'Json'
  | 'Markup'
  | 'Markdown'
  | 'Math'
  | 'Color'
  | 'DateTime'
  | 'Uuid'
  | 'IpAddress'
  | 'SensitiveData'
  | 'Command'
  | 'Sql'
  | 'RegexPattern'
  | 'StructuredData'
  | 'NaturalText'
  | 'Unknown';

/** Detected programming language */
export type DetectedLanguage =
  | 'JavaScript'
  | 'TypeScript'
  | 'Python'
  | 'Rust'
  | 'Go'
  | 'Java'
  | 'CSharp'
  | 'Cpp'
  | 'Ruby'
  | 'Php'
  | 'Swift'
  | 'Kotlin'
  | 'Sql'
  | 'Html'
  | 'Css'
  | 'Json'
  | 'Yaml'
  | 'Toml'
  | 'Markdown'
  | 'Shell'
  | 'PowerShell'
  | 'Unknown';

/** Extracted entity from content */
export interface ExtractedEntity {
  entity_type: string;
  value: string;
  start: number;
  end: number;
}

/** Suggested action for clipboard content */
export interface SuggestedAction {
  action_id: string;
  label: string;
  description: string;
  icon?: string;
  priority: number;
}

/** Content statistics */
export interface ContentStats {
  char_count: number;
  word_count: number;
  line_count: number;
  has_unicode: boolean;
  has_emoji: boolean;
  has_whitespace_only_lines: boolean;
}

/** Formatting hints for display */
export interface FormattingHints {
  syntax_highlight: boolean;
  language_hint?: string;
  preserve_whitespace: boolean;
  is_multiline: boolean;
  max_preview_lines: number;
}

/** Complete clipboard analysis result */
export interface ClipboardAnalysis {
  category: ContentCategory;
  secondary_categories: ContentCategory[];
  language?: DetectedLanguage;
  confidence: number;
  entities: ExtractedEntity[];
  suggested_actions: SuggestedAction[];
  stats: ContentStats;
  is_sensitive: boolean;
  formatting: FormattingHints;
}

/** Clipboard template */
export interface ClipboardTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  category?: string;
  tags: string[];
  createdAt: number;
  usageCount: number;
}

/** Transform action type */
export type TransformAction =
  | 'format_json'
  | 'minify_json'
  | 'extract_urls'
  | 'extract_emails'
  | 'trim_whitespace'
  | 'to_uppercase'
  | 'to_lowercase'
  | 'remove_empty_lines'
  | 'sort_lines'
  | 'unique_lines'
  | 'escape_html'
  | 'unescape_html';

export interface ClipboardContextState {
  // Current clipboard state
  currentContent: string | null;
  currentAnalysis: ClipboardAnalysis | null;
  isAnalyzing: boolean;

  // Templates
  templates: ClipboardTemplate[];

  // Monitoring
  isMonitoring: boolean;
  lastUpdateTime: number | null;

  // Settings
  autoAnalyze: boolean;
  monitoringInterval: number;

  // Error state
  error: string | null;
}

export interface ClipboardContextActions {
  // Content operations
  readClipboard: () => Promise<string | null>;
  writeText: (text: string) => Promise<void>;
  writeHtml: (html: string, altText?: string) => Promise<void>;
  clearClipboard: () => Promise<void>;

  // Analysis operations
  analyzeContent: (content: string) => Promise<ClipboardAnalysis | null>;
  analyzeCurrentClipboard: () => Promise<void>;
  getCurrentWithAnalysis: () => Promise<{ content: string; analysis: ClipboardAnalysis } | null>;

  // Transform operations
  transformContent: (content: string, action: TransformAction) => Promise<string | null>;
  transformAndWrite: (content: string, action: TransformAction) => Promise<void>;

  // Entity extraction
  extractEntities: (content: string) => Promise<ExtractedEntity[]>;
  getSuggestedActions: (content: string) => Promise<SuggestedAction[]>;

  // Detection
  detectCategory: (
    content: string
  ) => Promise<{
    category: ContentCategory;
    secondary: ContentCategory[];
    confidence: number;
  } | null>;
  detectLanguage: (content: string) => Promise<DetectedLanguage | null>;
  checkSensitive: (content: string) => Promise<boolean>;
  getStats: (content: string) => Promise<ContentStats | null>;

  // Template operations
  addTemplate: (template: Omit<ClipboardTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
  removeTemplate: (id: string) => void;
  updateTemplate: (id: string, updates: Partial<ClipboardTemplate>) => void;
  applyTemplate: (id: string, variables?: Record<string, string>) => Promise<string | null>;
  searchTemplates: (query: string) => ClipboardTemplate[];

  // Monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;

  // Settings
  setAutoAnalyze: (enabled: boolean) => void;
  setMonitoringInterval: (interval: number) => void;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

export type ClipboardContextStore = ClipboardContextState & ClipboardContextActions;

