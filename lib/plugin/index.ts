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
export { PluginHooksManager } from './hooks';
export { ExtendedHooksManager, getExtendedHooksManager, resetExtendedHooksManager } from './hooks-manager';
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
} from '@/types/plugin-extended';
