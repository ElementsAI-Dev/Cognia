/**
 * Cognia Plugin SDK for TypeScript/JavaScript
 * @version 2.0.0
 * @description Create powerful frontend plugins for Cognia with full type safety and comprehensive API access.
 *
 * @overview
 * This SDK provides everything you need to create plugins for Cognia, including:
 * - Complete type definitions for all plugin APIs
 * - Helper functions for defining plugins, tools, commands, and modes
 * - JSON Schema builders for tool parameters
 * - Comprehensive JSDoc documentation
 *
 * @example
 * ```typescript
 * import { definePlugin, defineTool, Schema, parameters } from '@cognia/plugin-sdk';
 * import type { PluginContext, PluginHooks } from '@cognia/plugin-sdk';
 *
 * export default definePlugin({
 *   activate(context: PluginContext): PluginHooks {
 *     context.logger.info('Plugin activated!');
 *
 *     context.agent.registerTool({
 *       name: 'my_tool',
 *       pluginId: context.pluginId,
 *       definition: {
 *         name: 'my_tool',
 *         description: 'Does something cool',
 *         parametersSchema: parameters({
 *           input: Schema.string('Input text'),
 *         }, ['input']),
 *       },
 *       execute: async (args, toolContext) => {
 *         return { result: 'Success!' };
 *       },
 *     });
 *
 *     return {
 *       onAgentStep: (agentId, step) => {
 *         context.logger.debug(`Agent step: ${step.type}`);
 *       },
 *     };
 *   },
 * });
 * ```
 *
 * @module @cognia/plugin-sdk
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type {
  PluginType,
  PluginCapability,
  PluginStatus,
  PluginSource,
  PluginPermission,
  PluginAPIPermission,
  PluginApiErrorCode,
  PluginApiError,
  PluginHostCompatInfo,
  PluginHostInvokeResponse,
  PluginHostInvokeOptions,
  PluginHostTransport,
  /** @deprecated Use PluginAPIPermission instead */
  ExtendedPluginPermission,
} from './core';

// =============================================================================
// MANIFEST TYPES
// =============================================================================

export type {
  PluginManifest,
  PluginConfigSchema,
  PluginConfigProperty,
  PluginActivationEvent,
  PluginScheduledTaskDef,
  PluginManifestTaskTrigger,
} from './manifest';

// =============================================================================
// A2UI TYPES
// =============================================================================

export type {
  A2UIPluginComponentDef,
  A2UITemplateDef,
  PluginA2UIComponent,
  A2UIPluginComponentProps,
  PluginA2UIAction,
  PluginA2UIDataChange,
  PluginA2UIAPI,
} from './a2ui';

// =============================================================================
// TOOL TYPES
// =============================================================================

export type {
  PluginToolDef,
  PluginTool,
  PluginToolContext,
  PluginAgentStep,
  PluginAgentAPI,
} from './tools';

// =============================================================================
// MODE TYPES
// =============================================================================

export type {
  PluginModeDef,
  ModeDefinition,
  /** @deprecated Use ModeDefinition instead */
  ExtendedModeDef,
  ModeToolConfig,
  ModePromptTemplate,
  ModeContext,
  OutputFormat,
} from './modes';

export { ModeBuilder, createModeBuilder } from './modes';
export { ModeTemplates } from './modes';

// =============================================================================
// HOOK TYPES
// =============================================================================

export type {
  PluginMessage,
  PluginHooks,
  PromptAttachment,
  PromptSubmitContext,
  PromptSubmitResult,
  PreToolUseResult,
  PostToolUseResult,
  PreCompactContext,
  PreCompactResult,
  ChatResponseData,
  PostChatReceiveResult,
  HookPriority,
  HookRegistrationOptions,
  HookSandboxExecutionResult,
  PluginHooksAll,
  /** @deprecated Use PluginHooksAll instead */
  ExtendedPluginHooks,
} from './hooks';

// =============================================================================
// COMMAND TYPES
// =============================================================================

export type {
  PluginCommand,
} from './commands';

// =============================================================================
// API TYPES
// =============================================================================

// Network API
export type {
  PluginNetworkAPI,
  NetworkRequestOptions,
  NetworkResponse,
  DownloadOptions,
  DownloadProgress,
  DownloadResult,
  UploadOptions,
} from './api/network';

// File System API
export type {
  PluginFileSystemAPI,
  FileEntry,
  FileStat,
  FileWatchEvent,
  PluginClipboardAPI,
} from './api/filesystem';

// Shell API
export type {
  PluginShellAPI,
  ShellOptions,
  ShellResult,
  SpawnOptions,
  ChildProcess,
} from './api/shell';

// Database API
export type {
  PluginDatabaseAPI,
  DatabaseResult,
  DatabaseTransaction,
  TableSchema,
  TableColumn,
  TableIndex,
} from './api/database';

// IPC API
export type {
  PluginIPCAPI,
  IPCMessage,
  IPCRequest,
  IPCResponse,
  RPCHandler,
  RPCMethod,
  IPCConnectionState,
  IPCConnection,
} from './api/ipc';

// Message Bus API
export type {
  PluginMessageBusAPI,
  MessagePriority,
  SubscriptionOptions,
  MessageMetadata,
  MessageEnvelope,
  TopicStats,
  RequestHandler,
} from './api/message-bus';

// Debug API
export type {
  PluginDebugAPI,
  DebugLogLevel,
  DebugLogEntry,
  TraceEntry,
  PerformanceMetrics,
  Breakpoint,
  DebugSession,
  SlowOperation,
} from './api/debug';

// Profiler API
export type {
  PluginProfilerAPI,
  PerformanceSample,
  MemoryUsage,
  PerformanceBucket,
  PerformanceReport,
  SlowOperationEntry,
  ProfilerConfig,
} from './api/profiler';

// Enhanced I18n API
export type {
  PluginI18nAPI,
  SupportedLocale,
  TranslationParams,
  PluralForms,
  TranslationValue,
  TranslationDictionary,
  LocaleConfig,
  TranslationOptions,
  I18nLoadOptions,
  TypedTranslationsConfig,
} from './api/i18n';
export { createTypedTranslations } from './api/i18n';

// Version Management API
export type {
  PluginVersionAPI,
  SemanticVersion,
  UpdateInfo,
  VersionHistoryEntry,
  RollbackOptions,
  UpdateOptions,
  VersionConstraint,
} from './api/version';

// Dependency Management API
export type {
  PluginDependencyAPI,
  DependencySpec,
  ResolvedDependency,
  DependencyNode,
  DependencyConflict,
  DependencyCheckResult,
} from './api/dependencies';

// UI API
export type {
  PluginUIAPI,
  PluginNotification,
  PluginDialog,
  PluginInputDialog,
  PluginConfirmDialog,
  PluginStatusBarItem,
  PluginSidebarPanel,
  PluginShortcutsAPI,
  ShortcutOptions,
  ShortcutRegistration,
  PluginContextMenuAPI,
  ContextMenuItem,
  ContextMenuClickContext,
  PluginWindowAPI,
  WindowOptions,
  PluginWindow,
  PluginSecretsAPI,
} from './api/ui';

// Scheduler API
export type {
  PluginSchedulerAPI,
  PluginScheduledTask,
  PluginTaskExecution,
  PluginTaskTrigger,
  CronTrigger,
  IntervalTrigger,
  OnceTrigger,
  EventTrigger,
  PluginTaskStatus,
  PluginTaskExecutionStatus,
  PluginTaskResult,
  PluginTaskContext,
  PluginTaskHandler,
  CreatePluginTaskInput,
  UpdatePluginTaskInput,
  PluginTaskFilter,
  PluginSchedulerHooks,
} from './api/scheduler';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

// Base Context
export type {
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginSettingsAPI,
  PluginPythonAPI,
  PluginPythonModule,
  PluginContext,
} from './context/base';

// Extended Context
export type {
  // Core domain types
  ChatMode,
  PluginUIAttachment,
  PluginUIMessage,
  PluginSession,
  CreateSessionInput,
  UpdateSessionInput,
  PluginProject,
  CreateProjectInput,
  UpdateProjectInput,
  KnowledgeFile,
  PluginArtifact,
  ArtifactMetadata,
  CanvasDocumentVersion,
  CanvasSuggestion,
  ExportData,
  ExtensionComponent,
  // Session API
  SessionFilter,
  MessageQueryOptions,
  SendMessageOptions,
  MessageAttachment,
  SessionStats,
  PluginSessionAPI,
  // Project API
  ProjectFilter,
  ProjectFileInput,
  PluginProjectAPI,
  // Vector API
  VectorDocument,
  VectorSearchOptions,
  VectorFilter,
  VectorSearchResult,
  CollectionOptions,
  CollectionStats,
  PluginVectorAPI,
  // Theme API
  ThemeMode,
  ColorThemePreset,
  ThemeColors,
  CustomTheme,
  ThemeState,
  PluginThemeAPI,
  // Export API
  ExportFormat,
  ExportOptions,
  CustomExporter,
  ExportResult,
  PluginExportAPI,
  // I18n API (base types - enhanced types exported separately above)
  Locale,
  // Canvas API
  ArtifactLanguage,
  PluginCanvasDocument,
  CreateCanvasDocumentOptions,
  CanvasSelection,
  PluginCanvasAPI,
  // Artifact API
  CreateArtifactOptions,
  ArtifactFilter,
  ArtifactRenderer,
  PluginArtifactAPI,
  // Notification API
  NotificationOptions,
  NotificationAction,
  Notification,
  PluginNotificationCenterAPI,
  // AI Provider API
  AIChatMessage,
  AIChatOptions,
  AIChatChunk,
  AIModel,
  AIProviderDefinition,
  PluginAIProviderAPI,
  // Extension API
  ExtensionPoint,
  ExtensionOptions,
  ExtensionRegistration,
  ExtensionProps,
  PluginExtensionAPI,
  // Permission API
  PluginPermissionAPI,
  // Plugin Context API
  PluginContextAPI,
  /** @deprecated Use PluginContextAPI instead */
  ExtendedPluginContext,
} from './context/extended';

// =============================================================================
// BROWSER API TYPES
// =============================================================================

export type {
  PluginBrowserAPI,
  BrowserLaunchOptions,
  BrowserInstance,
  BrowserContext,
  BrowserPage,
  NavigationOptions,
  SelectorOptions,
  ScreenshotOptions,
  ScreenshotResult,
  ElementInfo,
  TableData,
  ScrapeResult,
  Cookie,
  ProxyConfig,
} from './api/browser';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export { Schema, parameters } from './helpers/schema';
export { definePlugin, defineTool, defineCommand } from './helpers/plugin';
export { tool } from './helpers/tool';
export { composeHooks, defineHooks, conditionalHook, debouncedHook } from './helpers/hooks';
export type { PluginDefinition } from './helpers/plugin';
export type { ToolConfig, ToolDefinition, InferSchemaType, InferParams } from './helpers/tool';

// Export helpers
export {
  exportToCsv,
  exportToJson,
  exportToHtml,
  exportToMarkdown,
  flattenObject,
  autoDetectColumns,
} from './helpers/export';
export type {
  CsvExportOptions,
  JsonExportOptions,
  HtmlExportOptions,
  MarkdownExportOptions,
  DataExportResult,
  ExportProgressCallback,
} from './helpers/export';

// Scraper helpers
export {
  BaseScraper,
  ProviderRegistry,
  parseTableData,
  cleanText,
  extractNumber,
  extractPrice,
  normalizeModelName,
} from './helpers/scraper';
export type {
  ScraperConfig,
  ScraperOptions,
  ScraperState,
  ScraperResult,
  ProviderEntry,
  ProgressCallback,
} from './helpers/scraper';

// =============================================================================
// REACT HOOKS
// =============================================================================

export {
  initPluginContext,
  getPluginContext,
  usePluginContext,
  usePluginStorage,
  usePluginEvents,
  usePluginSettings,
  useSession,
  useTheme,
  useIPC,
  useMessageBus,
  useDebug,
  useAsyncData,
} from './react';

// =============================================================================
// TESTING UTILITIES
// =============================================================================

export {
  createMockLogger,
  createMockStorage,
  createMockEventEmitter,
  createMockSettings,
  createMockContext,
  createMockToolContext,
  testTool,
  testPluginTool,
  testHook,
  createSpy,
} from './testing';

export type {
  MockLogger,
  MockStorage,
  MockEventEmitter,
  MockContextOptions,
  MockPluginContext,
} from './testing';
