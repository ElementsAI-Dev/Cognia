/**
 * Plugin System - Main exports
 * 
 * Organized into subdirectories:
 * - core/       - Core plugin infrastructure (manager, loader, registry, context, sandbox)
 * - bridge/     - Integration bridges (A2UI, tools, agent, workflow)
 * - devtools/   - Developer tools (dev-tools, debugger, profiler, hot-reload, dev-server)
 * - messaging/  - Communication (hooks-system, IPC, message-bus)
 * - security/   - Security (permission-guard, signature)
 * - lifecycle/  - Version management (updater, backup, rollback)
 * - package/    - Package management (marketplace, dependency-resolver, conflict-detector)
 * - utils/      - Utilities (analytics, i18n-loader, templates)
 * - scheduler/  - Task scheduling (scheduler-plugin-executor)
 * - api/        - Extended APIs
 */

// =============================================================================
// Core - Plugin infrastructure
// =============================================================================
export { PluginManager, getPluginManager, initializePluginManager } from './core/manager';
export type { PythonRuntimeInfo } from './core/manager';
export { PluginLoader } from './core/loader';
export { PluginRegistry } from './core/registry';
export { createPluginSystemLogger, pluginLogger, loggers, type PluginSystemLogger } from './core/logger';
export { createPluginContext, createFullPluginContext, isFullPluginContext, type FullPluginContext } from './core/context';
export { PluginSandbox } from './core/sandbox';
export { validatePluginManifest, validatePluginConfig, parseManifest } from './core/validation';
export type { ValidationError, ValidationResult, ConfigValidationResult } from './core/validation';

// =============================================================================
// Bridge - Integration bridges
// =============================================================================
export { PluginA2UIBridge } from './bridge/a2ui-bridge';
export { PluginToolsBridge } from './bridge/tools-bridge';
export {
  PluginAgentBridge,
  getPluginAgentBridge,
  usePluginAgentTools,
  usePluginAgentModes,
  mergeWithBuiltinTools,
  mergeWithBuiltinModes,
  type PluginAgentTool,
  type PluginAgentMode,
} from './bridge/agent-integration';
export {
  PluginWorkflowIntegration,
  getPluginWorkflowIntegration,
  resetPluginWorkflowIntegration,
  usePluginWorkflowIntegration,
} from './bridge/workflow-integration';

// =============================================================================
// Messaging - Communication systems
// =============================================================================
export {
  HookDispatcher,
  PluginLifecycleHooks,
  PluginEventHooks,
  getPluginLifecycleHooks,
  getPluginEventHooks,
  resetPluginLifecycleHooks,
  resetPluginEventHooks,
  normalizePriority,
  priorityToNumber,
  priorityToString,
  HookPriority,
  type HookRegistration,
  type HookSandboxExecutionResult,
  type HookMiddleware,
  type HookExecutionConfig,
} from './messaging/hooks-system';
/** @deprecated Use PluginLifecycleHooks instead */
export { PluginLifecycleHooks as PluginHooksManager } from './messaging/hooks-system';

export {
  PluginIPC,
  getPluginIPC,
  resetPluginIPC,
  createIPCAPI,
  type IPCMessage,
  type IPCRequest,
  type IPCResponse,
  type ExposedMethod,
  type PluginIPCAPI,
} from './messaging/ipc';

export {
  MessageBus,
  getMessageBus,
  resetMessageBus,
  createEventAPI,
  SystemEvents,
  type BusEvent,
  type EventSource,
  type EventFilter,
  type PluginEventAPI,
} from './messaging/message-bus';

// =============================================================================
// DevTools - Developer tools
// =============================================================================
export { 
  PluginDevTools,
  setDebugMode,
  isDebugEnabled,
  debugLog,
  getDebugLogs,
  clearDebugLogs,
  inspectPlugin,
  inspectAllPlugins,
  createMockPluginContext,
  validateManifestStrict,
} from './devtools/dev-tools';

export {
  PluginDebugger,
  getPluginDebugger,
  resetPluginDebugger,
  type DebugSession,
  type Breakpoint,
  type CallFrame,
  type WatchExpression,
  type LogEntry,
} from './devtools/debugger';

export {
  PluginProfiler,
  getPluginProfiler,
  resetPluginProfiler,
  withProfiling,
  type ProfileEntry,
  type ProfileSummary,
  type Hotspot,
  type OperationStats,
  type FlameNode,
  type ResourceUsage,
} from './devtools/profiler';

export {
  PluginHotReload,
  getPluginHotReload,
  resetPluginHotReload,
  usePluginHotReload,
  type HotReloadConfig,
  type FileChangeEvent,
  type ReloadResult,
} from './devtools/hot-reload';

export {
  PluginDevServer,
  getPluginDevServer,
  resetPluginDevServer,
  usePluginDevServer,
  type DevServerConfig,
  type DevServerStatus,
  type DevConsoleMessage,
  type PluginBuildResult,
} from './devtools/dev-server';

// =============================================================================
// Security - Permission and signature verification
// =============================================================================
export {
  PermissionGuard,
  getPermissionGuard,
  resetPermissionGuard,
  PermissionError,
  createGuardedAPI,
  PERMISSION_GROUPS,
  PERMISSION_DESCRIPTIONS,
  DANGEROUS_PERMISSIONS,
  type PermissionRequest,
  type PermissionGrant,
  type PermissionAuditEntry,
} from './security/permission-guard';

export {
  PluginSignatureVerifier,
  getPluginSignatureVerifier,
  resetPluginSignatureVerifier,
  type PluginSignature,
  type SignatureVerificationResult,
  type SignerInfo,
  type TrustLevel,
  type TrustedPublisher,
} from './security/signature';

// =============================================================================
// Lifecycle - Version and backup management
// =============================================================================
export {
  PluginUpdater,
  getPluginUpdater,
  resetPluginUpdater,
  type UpdateInfo,
  type UpdateResult,
  type UpdateProgress,
  type AutoUpdateConfig,
} from './lifecycle/updater';

export {
  PluginBackupManager,
  getPluginBackupManager,
  resetPluginBackupManager,
  type PluginBackup,
  type BackupReason,
  type BackupResult,
  type RestoreResult,
} from './lifecycle/backup';

export {
  PluginRollbackManager,
  getPluginRollbackManager,
  resetPluginRollbackManager,
  type RollbackInfo,
  type RollbackResult,
  type RollbackPlan,
  type MigrationScript,
} from './lifecycle/rollback';

// =============================================================================
// Package - Marketplace and dependency management
// =============================================================================
export {
  PluginMarketplace,
  getPluginMarketplace,
  resetPluginMarketplace,
  usePluginMarketplace,
  type PluginRegistryEntry,
  type PluginSearchOptions,
  type PluginSearchResult,
  type PluginVersionInfo,
  type PluginDependency,
  type DependencyResolutionResult,
  type InstallationProgress,
  type MarketplaceConfig,
} from './package/marketplace';

export {
  DependencyResolver,
  getDependencyResolver,
  resetDependencyResolver,
  parseVersion,
  compareVersions,
  parseConstraint,
  satisfiesConstraint,
  type Dependency,
  type ResolvedDependency,
  type DependencyNode,
  type ResolutionResult,
  type DependencyConflict,
} from './package/dependency-resolver';

export {
  ConflictDetector,
  getConflictDetector,
  resetConflictDetector,
  type PluginConflict,
  type ConflictType,
  type ConflictSeverity,
  type ConflictDetectionResult,
  type ConflictResolution,
} from './package/conflict-detector';

// =============================================================================
// Utils - Analytics, i18n, templates
// =============================================================================
export {
  pluginAnalyticsStore,
  pluginLearningEngine,
  pluginHealthMonitor,
  initializeAnalytics,
  trackPluginEvent,
  getPluginInsights,
  getPluginHealth,
  getPluginRecommendations,
  type PluginUsageEvent,
  type PluginUsageStats,
  type LearningInsight,
  type PluginHealthStatus,
  type PluginRecommendation,
} from './utils/analytics';

export {
  PluginI18nLoader,
  getPluginI18nLoader,
  resetPluginI18nLoader,
  type PluginLocale,
  type I18nConfig,
  type TranslationOptions,
  type PluginI18nAPI as PluginTranslationAPI,
} from './utils/i18n-loader';

export {
  PLUGIN_TEMPLATES,
  scaffoldPlugin,
  getTemplateById,
  getTemplatesByType,
  getTemplatesByCapability,
  searchTemplates,
  type PluginTemplate,
  type PluginScaffoldOptions,
} from './utils/templates';

// =============================================================================
// Scheduler - Task scheduling
// =============================================================================
export {
  registerPluginTaskHandler,
  unregisterPluginTaskHandler,
  getPluginTaskHandler,
  hasPluginTaskHandler,
  getPluginTaskHandlerNames,
  clearPluginTaskHandlers,
} from './scheduler/scheduler-plugin-executor';

// =============================================================================
// Extended APIs
// =============================================================================
export * from './api';

// Re-export types
export type {
  Plugin,
  PluginManifest,
  PluginType,
  PluginCapability,
  PluginStatus,
  PluginSource,
  PluginContext,
  PluginHooks,
  PluginTool,
  PluginCommand,
  PluginA2UIComponent,
  PluginDefinition,
} from '@/types/plugin';

// Plugin Context API types
export type {
  PluginContextAPI,
  /** @deprecated Use PluginContextAPI instead */
  ExtendedPluginContext,
  PluginSessionAPI,
  PluginProjectAPI,
  PluginVectorAPI,
  PluginThemeAPI,
  PluginExportAPI,
  PluginI18nAPI,
  PluginCanvasAPI,
  PluginArtifactAPI,
  PluginNotificationCenterAPI,
  PluginAIProviderAPI,
  PluginExtensionAPI,
  PluginPermissionAPI,
  PluginAPIPermission,
  /** @deprecated Use PluginAPIPermission instead */
  ExtendedPluginPermission,
  ExtensionPoint,
  ExtensionRegistration,
} from '@/types/plugin/plugin-extended';
