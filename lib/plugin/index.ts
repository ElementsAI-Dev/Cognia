/**
 * Plugin System - Main exports
 */

export { PluginManager, getPluginManager, initializePluginManager } from './manager';
export { PluginLoader } from './loader';
export { PluginRegistry } from './registry';
export { createPluginContext, createFullPluginContext, isFullPluginContext, type FullPluginContext } from './context';
export { PluginSandbox } from './sandbox';
export { PluginA2UIBridge } from './a2ui-bridge';
export { PluginToolsBridge } from './tools-bridge';
// Hooks System - Unified hook management
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
  type HookPriority,
  type HookRegistration,
  type HookSandboxExecutionResult,
  type HookMiddleware,
  type HookExecutionConfig,
} from './hooks-system';
// Backward compatibility (deprecated aliases)
export { PluginLifecycleHooks as PluginHooksManager } from './hooks-system';
export { PluginEventHooks as ExtendedHooksManager } from './hooks-system';
export { getPluginEventHooks as getExtendedHooksManager } from './hooks-system';
export { resetPluginEventHooks as resetExtendedHooksManager } from './hooks-system';
export { PluginEventHooks as AdvancedHooksManager } from './hooks-system';
export { getPluginEventHooks as getAdvancedHooksManager } from './hooks-system';
export { resetPluginEventHooks as resetAdvancedHooksManager } from './hooks-system';
export {
  PluginWorkflowIntegration,
  getPluginWorkflowIntegration,
  resetPluginWorkflowIntegration,
  usePluginWorkflowIntegration,
} from './workflow-integration';

// Developer Tools
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
} from './dev-tools';

// Marketplace
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
} from './marketplace';

// Analytics and Learning
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
} from './analytics';

// Templates
export {
  PLUGIN_TEMPLATES,
  scaffoldPlugin,
  getTemplateById,
  getTemplatesByType,
  getTemplatesByCapability,
  searchTemplates,
  type PluginTemplate,
  type PluginScaffoldOptions,
} from './templates';

// Extended APIs
export * from './api';

// Hot Reload & Dev Server
export {
  PluginHotReload,
  getPluginHotReload,
  resetPluginHotReload,
  usePluginHotReload,
  type HotReloadConfig,
  type FileChangeEvent,
  type ReloadResult,
} from './hot-reload';

export {
  PluginDevServer,
  getPluginDevServer,
  resetPluginDevServer,
  usePluginDevServer,
  type DevServerConfig,
  type DevServerStatus,
  type DevConsoleMessage,
  type PluginBuildResult,
} from './dev-server';

// Plugin IPC & Message Bus
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
} from './ipc';

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
} from './message-bus';

// Permission Guard
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
} from './permission-guard';

// Plugin Updater & Backup
export {
  PluginUpdater,
  getPluginUpdater,
  resetPluginUpdater,
  type UpdateInfo,
  type UpdateResult,
  type UpdateProgress,
  type AutoUpdateConfig,
} from './updater';

export {
  PluginBackupManager,
  getPluginBackupManager,
  resetPluginBackupManager,
  type PluginBackup,
  type BackupReason,
  type BackupResult,
  type RestoreResult,
} from './backup';

export {
  PluginRollbackManager,
  getPluginRollbackManager,
  resetPluginRollbackManager,
  type RollbackInfo,
  type RollbackResult,
  type RollbackPlan,
  type MigrationScript,
} from './rollback';

// Profiler
export {
  PluginProfiler,
  getPluginProfiler,
  resetPluginProfiler,
  withProfiling,
  type ProfileEntry,
  type ProfileSummary,
  type FlameNode,
  type ResourceUsage,
} from './profiler';

// Dependency Resolver
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
} from './dependency-resolver';

// Signature Verification
export {
  PluginSignatureVerifier,
  getPluginSignatureVerifier,
  resetPluginSignatureVerifier,
  type PluginSignature,
  type SignatureVerificationResult,
  type SignerInfo,
  type TrustLevel,
  type TrustedPublisher,
} from './signature';

// i18n Loader
export {
  PluginI18nLoader,
  getPluginI18nLoader,
  resetPluginI18nLoader,
  type PluginLocale,
  type I18nConfig,
  type TranslationOptions,
  type PluginI18nAPI as PluginTranslationAPI,
} from './i18n-loader';

// Debugger
export {
  PluginDebugger,
  getPluginDebugger,
  resetPluginDebugger,
  type DebugSession,
  type Breakpoint,
  type CallFrame,
  type WatchExpression,
  type LogEntry,
} from './debugger';

// Conflict Detector
export {
  ConflictDetector,
  getConflictDetector,
  resetConflictDetector,
  type PluginConflict,
  type ConflictType,
  type ConflictSeverity,
  type ConflictDetectionResult,
  type ConflictResolution,
} from './conflict-detector';

// Agent Integration
export {
  PluginAgentBridge,
  getPluginAgentBridge,
  usePluginAgentTools,
  usePluginAgentModes,
  mergeWithBuiltinTools,
  mergeWithBuiltinModes,
  type PluginAgentTool,
  type PluginAgentMode,
} from './agent-integration';

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

// Extended types
export type {
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
  ExtensionPoint,
  ExtensionRegistration,
} from '@/types/plugin/plugin-extended';
