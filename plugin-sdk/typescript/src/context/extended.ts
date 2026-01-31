/**
 * Plugin Context API Types
 *
 * @description Type definitions for deeper integration with application features.
 * Includes session, project, vector, theme, export, i18n, canvas, artifact, notification,
 * AI provider, and extension APIs.
 */

import type { PluginAPIPermission } from '../core/types';

// =============================================================================
// SESSION API TYPES
// =============================================================================

/**
 * Session filter options
 */
export interface SessionFilter {
  projectId?: string;
  mode?: string; // ChatMode
  hasMessages?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Message query options
 */
export interface MessageQueryOptions {
  limit?: number;
  offset?: number;
  branchId?: string;
  includeDeleted?: boolean;
  afterId?: string;
  beforeId?: string;
}

/**
 * Send message options
 */
export interface SendMessageOptions {
  role?: 'user' | 'assistant' | 'system';
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
  skipProcessing?: boolean;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  type: 'file' | 'image' | 'code' | 'url';
  name: string;
  content?: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalTokens: number;
  averageResponseTime: number;
  branchCount: number;
  attachmentCount: number;
}

/**
 * Session API
 *
 * @remarks
 * Provides methods for managing chat sessions.
 *
 * @example
 * ```typescript
 * // Get current session
 * const current = context.session.getCurrentSession();
 *
 * // Create a session
 * const session = await context.session.createSession({
 *   title: 'New Chat',
 *   mode: 'chat',
 * });
 *
 * // Add a message
 * const message = await context.session.addMessage(session.id, 'Hello!');
 *
 * // Get session stats
 * const stats = await context.session.getSessionStats(session.id);
 * ```
 */
export interface PluginSessionAPI {
  getCurrentSession: () => unknown; // Session | null
  getCurrentSessionId: () => string | null;
  getSession: (id: string) => Promise<unknown>; // Session | null
  createSession: (options?: unknown) => Promise<unknown>; // CreateSessionInput
  updateSession: (id: string, updates: unknown) => Promise<void>; // UpdateSessionInput
  switchSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  listSessions: (filter?: SessionFilter) => Promise<unknown[]>; // Session[]
  getMessages: (sessionId: string, options?: MessageQueryOptions) => Promise<unknown[]>; // UIMessage[]
  addMessage: (sessionId: string, content: string, options?: SendMessageOptions) => Promise<unknown>; // UIMessage
  updateMessage: (sessionId: string, messageId: string, updates: unknown) => Promise<void>; // Partial<UIMessage>
  deleteMessage: (sessionId: string, messageId: string) => Promise<void>;
  onSessionChange: (handler: (session: unknown) => void) => () => void; // Session | null
  onMessagesChange: (sessionId: string, handler: (messages: unknown[]) => void) => () => void; // UIMessage[]
  getSessionStats: (sessionId: string) => Promise<SessionStats>;
}

// =============================================================================
// PROJECT API TYPES
// =============================================================================

/**
 * Project filter options
 */
export interface ProjectFilter {
  isArchived?: boolean;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Project file input
 */
export interface ProjectFileInput {
  name: string;
  content: string;
  type?: string; // KnowledgeFile['type']
  mimeType?: string;
}

/**
 * Project API
 *
 * @example
 * ```typescript
 * // Get current project
 * const project = context.project.getCurrentProject();
 *
 * // Create a project
 * const newProject = await context.project.createProject({
 *   name: 'My Project',
 *   description: 'Project description',
 * });
 *
 * // Add knowledge file
 * const file = await context.project.addKnowledgeFile(project.id, {
 *   name: 'document.txt',
 *   content: 'File content',
 *   type: 'text',
 * });
 *
 * // Link session to project
 * await context.project.linkSession(project.id, sessionId);
 * ```
 */
export interface PluginProjectAPI {
  getCurrentProject: () => unknown; // Project | null
  getCurrentProjectId: () => string | null;
  getProject: (id: string) => Promise<unknown>; // Project | null
  createProject: (options: unknown) => Promise<unknown>; // CreateProjectInput
  updateProject: (id: string, updates: unknown) => Promise<void>; // UpdateProjectInput
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => Promise<void>;
  listProjects: (filter?: ProjectFilter) => Promise<unknown[]>; // Project[]
  archiveProject: (id: string) => Promise<void>;
  unarchiveProject: (id: string) => Promise<void>;
  addKnowledgeFile: (projectId: string, file: ProjectFileInput) => Promise<unknown>; // KnowledgeFile
  removeKnowledgeFile: (projectId: string, fileId: string) => Promise<void>;
  updateKnowledgeFile: (projectId: string, fileId: string, content: string) => Promise<void>;
  getKnowledgeFiles: (projectId: string) => Promise<unknown[]>; // KnowledgeFile[]
  linkSession: (projectId: string, sessionId: string) => Promise<void>;
  unlinkSession: (projectId: string, sessionId: string) => Promise<void>;
  getProjectSessions: (projectId: string) => Promise<string[]>;
  onProjectChange: (handler: (project: unknown) => void) => () => void; // Project | null
  addTag: (projectId: string, tag: string) => Promise<void>;
  removeTag: (projectId: string, tag: string) => Promise<void>;
}

// =============================================================================
// VECTOR/RAG API TYPES
// =============================================================================

/**
 * Vector document
 */
export interface VectorDocument {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  topK?: number;
  threshold?: number;
  filters?: VectorFilter[];
  filterMode?: 'and' | 'or';
  includeMetadata?: boolean;
  includeEmbeddings?: boolean;
}

/**
 * Vector filter
 */
export interface VectorFilter {
  key: string;
  value: string | number | boolean;
  operation: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score: number;
  embedding?: number[];
}

/**
 * Collection options
 */
export interface CollectionOptions {
  embeddingModel?: string;
  dimensions?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  name: string;
  documentCount: number;
  dimensions: number;
  createdAt: Date;
  lastUpdated: Date;
  sizeBytes?: number;
}

/**
 * Vector/RAG API
 *
 * @example
 * ```typescript
 * // Create a collection
 * await context.vector.createCollection('my-collection', {
 *   embeddingModel: 'text-embedding-ada-002',
 * });
 *
 * // Add documents
 * const ids = await context.vector.addDocuments('my-collection', [
 *   { content: 'Document 1' },
 *   { content: 'Document 2' },
 * ]);
 *
 * // Search
 * const results = await context.vector.search('my-collection', 'search query', {
 *   topK: 5,
 *   threshold: 0.7,
 * });
 *
 * // Generate embedding
 * const embedding = await context.vector.embed('Some text');
 * ```
 */
export interface PluginVectorAPI {
  createCollection: (name: string, options?: CollectionOptions) => Promise<string>;
  deleteCollection: (name: string) => Promise<void>;
  listCollections: () => Promise<string[]>;
  getCollectionInfo: (name: string) => Promise<CollectionStats>;
  addDocuments: (collection: string, docs: VectorDocument[]) => Promise<string[]>;
  updateDocuments: (collection: string, docs: VectorDocument[]) => Promise<void>;
  deleteDocuments: (collection: string, ids: string[]) => Promise<void>;
  search: (collection: string, query: string, options?: VectorSearchOptions) => Promise<VectorSearchResult[]>;
  searchByEmbedding: (collection: string, embedding: number[], options?: VectorSearchOptions) => Promise<VectorSearchResult[]>;
  embed: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<number[][]>;
  getDocumentCount: (collection: string) => Promise<number>;
  clearCollection: (collection: string) => Promise<void>;
}

// =============================================================================
// THEME API TYPES
// =============================================================================

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Color theme preset
 */
export type ColorThemePreset =
  | 'default'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'lavender'
  | 'rose'
  | 'slate'
  | 'amber';

/**
 * Theme colors
 */
export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
}

/**
 * Custom theme
 */
export interface CustomTheme {
  id: string;
  name: string;
  colors: Partial<ThemeColors>;
  isDark: boolean;
}

/**
 * Theme state
 */
export interface ThemeState {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colorPreset: ColorThemePreset;
  customThemeId: string | null;
  colors: ThemeColors;
}

/**
 * Theme API
 *
 * @example
 * ```typescript
 * // Get current theme
 * const theme = context.theme.getTheme();
 *
 * // Set theme mode
 * context.theme.setMode('dark');
 *
 * // Register custom theme
 * const themeId = context.theme.registerCustomTheme({
 *   name: 'My Theme',
 *   colors: {
 *     primary: '#007acc',
 *     background: '#1e1e1e',
 *   },
 *   isDark: true,
 * });
 *
 * // Activate custom theme
 * context.theme.activateCustomTheme(themeId);
 *
 * // Listen for changes
 * const unsubscribe = context.theme.onThemeChange((theme) => {
 *   console.log('Theme changed:', theme.mode);
 * });
 * ```
 */
export interface PluginThemeAPI {
  getTheme: () => ThemeState;
  getMode: () => ThemeMode;
  getResolvedMode: () => 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  getColorPreset: () => ColorThemePreset;
  setColorPreset: (preset: ColorThemePreset) => void;
  getAvailablePresets: () => ColorThemePreset[];
  getColors: () => ThemeColors;
  registerCustomTheme: (theme: Omit<CustomTheme, 'id'>) => string;
  updateCustomTheme: (id: string, updates: Partial<CustomTheme>) => void;
  deleteCustomTheme: (id: string) => void;
  getCustomThemes: () => CustomTheme[];
  activateCustomTheme: (id: string) => void;
  onThemeChange: (handler: (theme: ThemeState) => void) => () => void;
  applyScopedColors: (element: HTMLElement, colors: Partial<ThemeColors>) => () => void;
}

// =============================================================================
// EXPORT API TYPES
// =============================================================================

/**
 * Export format
 */
export type ExportFormat =
  | 'markdown'
  | 'json'
  | 'html'
  | 'animated-html'
  | 'pdf'
  | 'text'
  | 'docx'
  | 'csv';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  theme?: 'light' | 'dark' | 'system';
  showTimestamps?: boolean;
  showTokens?: boolean;
  showThinkingProcess?: boolean;
  showToolCalls?: boolean;
  includeMetadata?: boolean;
  includeAttachments?: boolean;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
}

/**
 * Custom exporter
 */
export interface CustomExporter {
  id: string;
  name: string;
  description: string;
  format: string;
  extension: string;
  mimeType: string;
  export: (data: unknown) => Promise<Blob | string>; // ExportData
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

/**
 * Export API
 *
 * @example
 * ```typescript
 * // Export a session
 * const result = await context.export.exportSession(sessionId, {
 *   format: 'markdown',
 *   theme: 'dark',
 * });
 *
 * // Download
 * context.export.download(result, 'chat-export.md');
 *
 * // Register custom exporter
 * context.export.registerExporter({
 *   id: 'my-exporter',
 *   name: 'My Exporter',
 *   format: 'custom',
 *   extension: 'custom',
 *   mimeType: 'text/plain',
 *   export: async (data) => {
 *     return 'Exported content';
 *   },
 * });
 * ```
 */
export interface PluginExportAPI {
  exportSession: (sessionId: string, options: ExportOptions) => Promise<ExportResult>;
  exportProject: (projectId: string, options: ExportOptions) => Promise<ExportResult>;
  exportMessages: (messages: unknown[], options: ExportOptions) => Promise<ExportResult>; // UIMessage[]
  download: (result: ExportResult, filename?: string) => void;
  registerExporter: (exporter: CustomExporter) => () => void;
  getAvailableFormats: () => ExportFormat[];
  getCustomExporters: () => CustomExporter[];
  generateFilename: (title: string, extension: string) => string;
}

// =============================================================================
// I18N API TYPES
// =============================================================================

/**
 * Locale
 */
export type Locale = 'en' | 'zh-CN';

/**
 * Translation params
 */
export type TranslationParams = Record<string, string | number | boolean>;

/**
 * I18n API
 *
 * @example
 * ```typescript
 * // Get current locale
 * const locale = context.i18n.getCurrentLocale();
 *
 * // Translate
 * const text = context.i18n.t('my.key', { name: 'World' });
 *
 * // Register translations
 * context.i18n.registerTranslations('en', {
 *   'my.key': 'Hello {name}!',
 * });
 *
 * // Format date
 * const formatted = context.i18n.formatDate(new Date(), {
 *   year: 'numeric',
 *   month: 'long',
 *   day: 'numeric',
 * });
 * ```
 */
export interface PluginI18nAPI {
  getCurrentLocale: () => Locale;
  getAvailableLocales: () => Locale[];
  getLocaleName: (locale: Locale) => string;
  t: (key: string, params?: TranslationParams) => string;
  registerTranslations: (locale: Locale, translations: Record<string, string>) => void;
  hasTranslation: (key: string) => boolean;
  onLocaleChange: (handler: (locale: Locale) => void) => () => void;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date) => string;
}

// =============================================================================
// CANVAS API TYPES
// =============================================================================

/**
 * Artifact language
 */
export type ArtifactLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'html'
  | 'css'
  | 'json'
  | 'xml'
  | 'yaml'
  | 'markdown'
  | 'text'
  | 'sql'
  | 'bash'
  | 'powershell';

/**
 * Canvas document
 */
export interface PluginCanvasDocument {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  language: ArtifactLanguage;
  type: 'code' | 'text';
  createdAt: Date;
  updatedAt: Date;
  suggestions?: unknown[]; // CanvasSuggestion[]
  versions?: unknown[]; // CanvasDocumentVersion[]
}

/**
 * Canvas document creation options
 */
export interface CreateCanvasDocumentOptions {
  sessionId?: string;
  title: string;
  content: string;
  language: ArtifactLanguage;
  type: 'code' | 'text';
}

/**
 * Canvas selection
 */
export interface CanvasSelection {
  start: number;
  end: number;
  text: string;
}

/**
 * Canvas API
 *
 * @example
 * ```typescript
 * // Get current document
 * const doc = context.canvas.getCurrentDocument();
 *
 * // Create a document
 * const docId = await context.canvas.createDocument({
 *   title: 'New Document',
 *   content: 'console.log("Hello!");',
 *   language: 'javascript',
 *   type: 'code',
 * });
 *
 * // Update content
 * context.canvas.setContent('Updated content', docId);
 *
 * // Save version
 * const versionId = await context.canvas.saveVersion(docId, 'Initial version');
 * ```
 */
export interface PluginCanvasAPI {
  getCurrentDocument: () => PluginCanvasDocument | null;
  getDocument: (id: string) => PluginCanvasDocument | null;
  createDocument: (options: CreateCanvasDocumentOptions) => Promise<string>;
  updateDocument: (id: string, updates: Partial<PluginCanvasDocument>) => void;
  deleteDocument: (id: string) => void;
  openDocument: (id: string) => void;
  closeCanvas: () => void;
  getSelection: () => CanvasSelection | null;
  setSelection: (start: number, end: number) => void;
  insertText: (text: string) => void;
  replaceSelection: (text: string) => void;
  getContent: (id?: string) => string;
  setContent: (content: string, id?: string) => void;
  saveVersion: (id: string, description?: string) => Promise<string>;
  restoreVersion: (documentId: string, versionId: string) => void;
  getVersions: (id: string) => unknown[]; // CanvasDocumentVersion[]
  onCanvasChange: (handler: (doc: PluginCanvasDocument | null) => void) => () => void;
  onContentChange: (handler: (content: string) => void) => () => void;
}

// =============================================================================
// ARTIFACT API TYPES
// =============================================================================

/**
 * Artifact creation options
 */
export interface CreateArtifactOptions {
  title: string;
  content: string;
  language: ArtifactLanguage;
  sessionId?: string;
  messageId?: string;
  type?: 'code' | 'text' | 'react' | 'html' | 'svg' | 'mermaid';
}

/**
 * Artifact filter
 */
export interface ArtifactFilter {
  sessionId?: string;
  language?: ArtifactLanguage;
  type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Artifact renderer
 */
export interface ArtifactRenderer {
  type: string;
  name: string;
  canRender: (artifact: unknown) => boolean; // Artifact
  render: (artifact: unknown, container: HTMLElement) => () => void; // Artifact
}

/**
 * Artifact API
 *
 * @example
 * ```typescript
 * // Get active artifact
 * const artifact = context.artifact.getActiveArtifact();
 *
 * // Create artifact
 * const artifactId = await context.artifact.createArtifact({
 *   title: 'My Component',
 *   content: 'export default function() { return <div>Hello!</div>; }',
 *   language: 'typescript',
 *   type: 'react',
 * });
 *
 * // Open artifact
 * context.artifact.openArtifact(artifactId);
 *
 * // Register custom renderer
 * context.artifact.registerRenderer('my-type', {
 *   type: 'my-type',
 *   name: 'My Renderer',
 *   canRender: (artifact) => artifact.type === 'my-type',
 *   render: (artifact, container) => {
 *     container.innerHTML = artifact.content;
 *     return () => { container.innerHTML = ''; };
 *   },
 * });
 * ```
 */
export interface PluginArtifactAPI {
  getActiveArtifact: () => unknown; // Artifact | null
  getArtifact: (id: string) => unknown; // Artifact | null
  createArtifact: (options: CreateArtifactOptions) => Promise<string>;
  updateArtifact: (id: string, updates: unknown) => void; // Partial<Artifact>
  deleteArtifact: (id: string) => void;
  listArtifacts: (filter?: ArtifactFilter) => unknown[]; // Artifact[]
  openArtifact: (id: string) => void;
  closeArtifact: () => void;
  onArtifactChange: (handler: (artifact: unknown) => void) => () => void; // Artifact | null
  registerRenderer: (type: string, renderer: ArtifactRenderer) => () => void;
}

// =============================================================================
// NOTIFICATION CENTER API TYPES
// =============================================================================

/**
 * Notification options
 */
export interface NotificationOptions {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  icon?: string;
  actions?: NotificationAction[];
  persistent?: boolean;
  progress?: number;
}

/**
 * Notification action
 */
export interface NotificationAction {
  label: string;
  action: string;
  variant?: 'default' | 'primary' | 'destructive';
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: Date;
  actions?: NotificationAction[];
  progress?: number;
  persistent: boolean;
}

/**
 * Notification center API
 *
 * @example
 * ```typescript
 * // Create notification
 * const id = context.notifications.create({
 *   title: 'Success',
 *   message: 'Operation completed',
 *   type: 'success',
 *   actions: [
 *     { label: 'View', action: 'view' },
 *   ],
 * });
 *
 * // Create progress notification
 * const progress = context.notifications.createProgress(
 *   'Processing',
 *   'Starting...'
 * );
 * progress.update(50, 'Half way there...');
 * progress.complete('Done!');
 *
 * // Listen for actions
 * context.notifications.onAction((id, action) => {
 *   console.log(`Action ${action} on notification ${id}`);
 * });
 * ```
 */
export interface PluginNotificationCenterAPI {
  create: (options: NotificationOptions) => string;
  update: (id: string, updates: Partial<NotificationOptions>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  getAll: () => Notification[];
  onAction: (handler: (id: string, action: string) => void) => () => void;
  createProgress: (title: string, message: string) => {
    id: string;
    update: (progress: number, message?: string) => void;
    complete: (message?: string) => void;
    error: (message: string) => void;
  };
}

// =============================================================================
// AI PROVIDER API TYPES
// =============================================================================

/**
 * AI chat message
 */
export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

/**
 * AI chat options
 */
export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
}

/**
 * AI chat chunk
 */
export interface AIChatChunk {
  content: string;
  finishReason?: 'stop' | 'length' | 'tool_calls';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI model
 */
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  capabilities: ('chat' | 'completion' | 'embedding' | 'vision' | 'function_calling')[];
}

/**
 * AI provider definition
 */
export interface AIProviderDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  models: AIModel[];
  chat: (messages: AIChatMessage[], options?: AIChatOptions) => AsyncIterable<AIChatChunk>;
  embed?: (texts: string[]) => Promise<number[][]>;
  validateApiKey?: (apiKey: string) => Promise<boolean>;
}

/**
 * AI provider API
 *
 * @example
 * ```typescript
 * // Register custom provider
 * context.ai.registerProvider({
 *   id: 'my-provider',
 *   name: 'My Provider',
 *   description: 'Custom AI provider',
 *   models: [
 *     {
 *       id: 'my-model',
 *       name: 'My Model',
 *       provider: 'my-provider',
 *       contextLength: 4096,
 *       capabilities: ['chat', 'function_calling'],
 *     },
 *   ],
 *   chat: async function* (messages, options) {
 *     yield { content: 'Response' };
 *   },
 * });
 *
 * // Chat with AI
 * for await (const chunk of context.ai.chat([
 *   { role: 'user', content: 'Hello!' },
 * ])) {
 *   console.log(chunk.content);
 * }
 * ```
 */
export interface PluginAIProviderAPI {
  registerProvider: (provider: AIProviderDefinition) => () => void;
  getAvailableModels: () => AIModel[];
  getProviderModels: (providerId: string) => AIModel[];
  chat: (messages: AIChatMessage[], options?: AIChatOptions) => AsyncIterable<AIChatChunk>;
  embed: (texts: string[]) => Promise<number[][]>;
  getDefaultModel: () => string;
  getDefaultProvider: () => string;
}

// =============================================================================
// EXTENSION API TYPES
// =============================================================================

/**
 * Extension point
 */
export type ExtensionPoint =
  | 'sidebar.left.top'
  | 'sidebar.left.bottom'
  | 'sidebar.right.top'
  | 'sidebar.right.bottom'
  | 'toolbar.left'
  | 'toolbar.center'
  | 'toolbar.right'
  | 'statusbar.left'
  | 'statusbar.center'
  | 'statusbar.right'
  | 'chat.input.above'
  | 'chat.input.below'
  | 'chat.input.actions'
  | 'chat.message.actions'
  | 'chat.message.footer'
  | 'artifact.toolbar'
  | 'artifact.actions'
  | 'canvas.toolbar'
  | 'canvas.sidebar'
  | 'settings.general'
  | 'settings.appearance'
  | 'settings.ai'
  | 'settings.plugins'
  | 'command-palette';

/**
 * Extension options
 */
export interface ExtensionOptions {
  priority?: number;
  condition?: () => boolean;
}

/**
 * Extension registration
 */
export interface ExtensionRegistration {
  id: string;
  pluginId: string;
  point: ExtensionPoint;
  component: unknown; // React.ComponentType<ExtensionProps>
  options: ExtensionOptions;
}

/**
 * Extension props
 */
export interface ExtensionProps {
  pluginId: string;
  extensionId: string;
}

/**
 * Extension API
 *
 * @example
 * ```typescript
 * // Register extension
 * const unregister = context.extensions.registerExtension(
 *   'toolbar.right',
 *   (props) => {
 *     return <button onClick={() => console.log('Clicked')}>My Button</button>;
 *   },
 *   {
 *     priority: 100,
 *     condition: () => true,
 *   }
 * );
 *
 * // Get extensions for a point
 * const extensions = context.extensions.getExtensions('toolbar.right');
 * ```
 */
export interface PluginExtensionAPI {
  registerExtension: (
    point: ExtensionPoint,
    component: unknown, // React.ComponentType<ExtensionProps>
    options?: ExtensionOptions
  ) => () => void;
  getExtensions: (point: ExtensionPoint) => ExtensionRegistration[];
  hasExtensions: (point: ExtensionPoint) => boolean;
}

// =============================================================================
// PERMISSION API
// =============================================================================

/**
 * Permission API
 *
 * @example
 * ```typescript
 * // Check permission
 * const hasPermission = context.permissions.hasPermission('session:read');
 *
 * // Request permission
 * const granted = await context.permissions.requestPermission(
 *   'network:fetch',
 *   'To fetch data from external API'
 * );
 *
 * // Get all granted permissions
 * const permissions = context.permissions.getGrantedPermissions();
 * ```
 */
export interface PluginPermissionAPI {
  hasPermission: (permission: PluginAPIPermission) => boolean;
  requestPermission: (permission: PluginAPIPermission, reason?: string) => Promise<boolean>;
  getGrantedPermissions: () => PluginAPIPermission[];
  hasAllPermissions: (permissions: PluginAPIPermission[]) => boolean;
  hasAnyPermission: (permissions: PluginAPIPermission[]) => boolean;
}

// =============================================================================
// PLUGIN CONTEXT API
// =============================================================================

/**
 * Plugin context API with all additional feature APIs
 *
 * @remarks
 * Combines base PluginContext with feature APIs for deeper integration.
 * All feature APIs are optional and may not be available in all contexts.
 */
export interface PluginContextAPI {
  session: PluginSessionAPI;
  project: PluginProjectAPI;
  vector: PluginVectorAPI;
  theme: PluginThemeAPI;
  export: PluginExportAPI;
  i18n: PluginI18nAPI;
  canvas: PluginCanvasAPI;
  artifact: PluginArtifactAPI;
  notifications: PluginNotificationCenterAPI;
  ai: PluginAIProviderAPI;
  extensions: PluginExtensionAPI;
  permissions: PluginPermissionAPI;
}

// =============================================================================
// Backward Compatibility Aliases (Deprecated)
// =============================================================================

/**
 * @deprecated Use `PluginContextAPI` instead
 */
export type ExtendedPluginContext = PluginContextAPI;
