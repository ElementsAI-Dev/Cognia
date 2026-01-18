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
} from './modes';

// =============================================================================
// HOOK TYPES
// =============================================================================

export type {
  PluginMessage,
  PluginHooks,
  HookPriority,
  HookRegistrationOptions,
  HookSandboxExecutionResult,
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
  // I18n API
  Locale,
  TranslationParams,
  PluginI18nAPI,
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
  // Extended Context
  ExtendedPluginContext,
} from './context/extended';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export { Schema, parameters } from './helpers/schema';
export { definePlugin, defineTool, defineCommand } from './helpers/plugin';
export type { PluginDefinition } from './helpers/plugin';
