/**
 * Plugin UI Components - Exports
 * 
 * Components are organized into the following subfolders:
 * - core/       - Core plugin management (Manager, List, Card)
 * - config/     - Configuration components (Config, SettingsPage, CreateWizard)
 * - monitoring/ - Monitoring & analytics (Analytics, Health, Profiler, etc.)
 * - extension/  - Extension point system
 * - schema/     - JSON Schema form components
 * - dev/        - Development tools
 */

// Core plugin management
export { PluginManager, PluginList, PluginCard } from './core';

// Configuration
export { PluginConfig, PluginSettingsPage, PluginCreateWizard } from './config';

// Monitoring & Analytics
export { 
  PluginAnalytics,
  PluginHealth,
  PluginProfiler,
  PluginDependencyTree,
  PluginConflicts,
  PluginUpdates,
  type PluginHealthProps,
  type PluginProfilerProps,
  type PluginDependencyTreeProps,
  type PluginConflictsProps,
  type PluginUpdatesProps,
} from './monitoring';

// Extension points
export { 
  PluginExtensionPoint, 
  useHasExtensions, 
  useExtensions 
} from './extension';

// Schema Form
export { 
  SchemaForm, 
  validateAgainstSchema,
  SchemaField,
  type JSONSchema,
  type SchemaFormProps,
  type FieldSchema,
  type SchemaFieldProps,
} from './schema';

// Development Tools
export { PluginDevTools } from './dev';
