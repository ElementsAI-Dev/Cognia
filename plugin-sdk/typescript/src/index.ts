/**
 * Cognia Plugin SDK for TypeScript/JavaScript
 * 
 * Create powerful frontend plugins for Cognia with full type safety.
 */

// Re-export types from the main application
export type {
  // Core Plugin Types
  PluginType,
  PluginCapability,
  PluginStatus,
  PluginSource,
  PluginPermission,
  PluginManifest,
  PluginConfigSchema,
  PluginConfigProperty,
  PluginActivationEvent,
  
  // A2UI Types
  A2UIPluginComponentDef,
  A2UITemplateDef,
  PluginA2UIComponent,
  A2UIPluginComponentProps,
  
  // Tool Types
  PluginToolDef,
  PluginTool,
  PluginToolContext,
  
  // Mode Types
  PluginModeDef,
  
  // Hook Types
  PluginHooks,
  PluginA2UIAction,
  PluginA2UIDataChange,
  PluginAgentStep,
  PluginMessage,
  
  // Command Types
  PluginCommand,
  
  // Context Types
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginUIAPI,
  PluginNotification,
  PluginDialog,
  PluginInputDialog,
  PluginConfirmDialog,
  PluginStatusBarItem,
  PluginSidebarPanel,
  PluginA2UIAPI,
  PluginAgentAPI,
  PluginSettingsAPI,
  PluginPythonAPI,
  PluginPythonModule,
  
  // Extended API Types
  PluginNetworkAPI,
  NetworkRequestOptions,
  NetworkResponse,
  DownloadOptions,
  DownloadProgress,
  DownloadResult,
  UploadOptions,
  PluginFileSystemAPI,
  FileEntry,
  FileStat,
  FileWatchEvent,
  PluginClipboardAPI,
  PluginShellAPI,
  ShellOptions,
  ShellResult,
  SpawnOptions,
  ChildProcess,
  PluginDatabaseAPI,
  DatabaseResult,
  DatabaseTransaction,
  TableSchema,
  TableColumn,
  TableIndex,
  PluginShortcutsAPI,
  ShortcutOptions,
  ShortcutRegistration,
  PluginContextMenuAPI,
  ContextMenuItem,
  ContextMenuContext,
  ContextMenuClickContext,
  PluginWindowAPI,
  WindowOptions,
  PluginWindow,
  PluginSecretsAPI,
} from '@/types/plugin';

// Extended Plugin Types
export type {
  // Session API
  SessionFilter,
  MessageQueryOptions,
  SendMessageOptions,
  MessageAttachment,
  PluginSessionAPI,
  SessionStats,
  
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
  ExportData,
  ExportResult,
  PluginExportAPI,
  
  // I18n API
  Locale,
  TranslationParams,
  PluginI18nAPI,
  
  // Canvas API
  PluginCanvasDocument,
  CreateCanvasDocumentOptions,
  CanvasSelection,
  PluginCanvasAPI,
  
  // Artifact API
  CreateArtifactOptions,
  ArtifactFilter,
  PluginArtifactAPI,
  ArtifactRenderer,
  
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
  
  // Extension Points API
  ExtensionPoint,
  ExtensionOptions,
  ExtensionRegistration,
  ExtensionProps,
  PluginExtensionAPI,
  
  // Permission API
  ExtendedPluginPermission,
  PluginPermissionAPI,
  
  // Extended Context
  ExtendedPluginContext,
} from '@/types/plugin/plugin-extended';

// Extended Hooks
export type {
  ProjectHookEvents,
  CanvasHookEvents,
  ArtifactHookEvents,
  ExportHookEvents,
  ThemeHookEvents,
  AIHookEvents,
  VectorHookEvents,
  WorkflowHookEvents,
  UIHookEvents,
  ExtendedPluginHooks,
  HookPriority,
  HookRegistrationOptions,
  HookSandboxExecutionResult,
} from '@/types/plugin/plugin-hooks';

/**
 * Plugin definition that should be exported from your plugin
 */
export interface PluginDefinition {
  /** Plugin activation - called when plugin is enabled */
  activate: (context: import('@/types/plugin').PluginContext) => 
    Promise<import('@/types/plugin').PluginHooks | void> | 
    import('@/types/plugin').PluginHooks | 
    void;
  
  /** Plugin deactivation - called when plugin is disabled */
  deactivate?: () => Promise<void> | void;
}

/**
 * Helper to create a properly typed plugin
 */
export function definePlugin(definition: PluginDefinition): PluginDefinition {
  return definition;
}

/**
 * Helper to create a tool definition
 */
export function defineTool(
  name: string,
  description: string,
  parametersSchema: Record<string, unknown>,
  execute: (args: Record<string, unknown>, context: import('@/types/plugin').PluginToolContext) => Promise<unknown>,
  options?: {
    requiresApproval?: boolean;
    category?: string;
  }
): import('@/types/plugin').PluginToolDef & { execute: typeof execute } {
  return {
    name,
    description,
    parametersSchema,
    requiresApproval: options?.requiresApproval,
    category: options?.category,
    execute,
  };
}

/**
 * Helper to create a command definition
 */
export function defineCommand(
  id: string,
  name: string,
  execute: (args?: Record<string, unknown>) => void | Promise<void>,
  options?: {
    description?: string;
    icon?: string;
    shortcut?: string;
    enabled?: boolean | (() => boolean);
  }
): import('@/types/plugin').PluginCommand {
  return {
    id,
    name,
    execute,
    ...options,
  };
}

/**
 * JSON Schema helpers for tool parameter definitions
 */
export const Schema = {
  string(description?: string, options?: { enum?: string[]; minLength?: number; maxLength?: number }) {
    return { type: 'string' as const, description, ...options };
  },
  
  number(description?: string, options?: { minimum?: number; maximum?: number }) {
    return { type: 'number' as const, description, ...options };
  },
  
  integer(description?: string, options?: { minimum?: number; maximum?: number }) {
    return { type: 'integer' as const, description, ...options };
  },
  
  boolean(description?: string) {
    return { type: 'boolean' as const, description };
  },
  
  array(items: Record<string, unknown>, description?: string) {
    return { type: 'array' as const, items, description };
  },
  
  object(properties: Record<string, unknown>, required?: string[], description?: string) {
    return { type: 'object' as const, properties, required, description };
  },
  
  optional<T extends Record<string, unknown>>(schema: T): T & { required: false } {
    return { ...schema, required: false as const };
  },
};

/**
 * Type-safe parameter builder
 */
export function parameters<T extends Record<string, unknown>>(
  props: T,
  required?: (keyof T)[]
): { type: 'object'; properties: T; required?: string[] } {
  return {
    type: 'object',
    properties: props,
    required: required as string[] | undefined,
  };
}
