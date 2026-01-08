/**
 * Plugin System - Main exports
 */

export { PluginManager, getPluginManager, initializePluginManager } from './manager';
export { PluginLoader } from './loader';
export { PluginRegistry } from './registry';
export { createPluginContext } from './context';
export { PluginSandbox } from './sandbox';
export { PluginA2UIBridge } from './a2ui-bridge';
export { PluginToolsBridge } from './tools-bridge';
export { PluginHooksManager } from './hooks';
export {
  validatePluginManifest,
  validatePluginConfig,
} from './validation';

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
