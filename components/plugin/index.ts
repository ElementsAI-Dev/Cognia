/**
 * Plugin UI Components - Exports
 * 
 * Components are organized into the following subfolders:
 * - core/       - Core plugin management (List, Card, EmptyState)
 * - config/     - Configuration components (Config, CreateWizard, FilterBar)
 * - layout/     - Layout components (Layout, Sidebar, Header, StatsBar, MobileNav, BatchToolbar)
 * - monitoring/ - Monitoring & analytics (Analytics, Health, Profiler, etc.)
 * - extension/  - Extension point system
 * - schema/     - JSON Schema form components
 * - dev/        - Development tools
 * - marketplace/ - Plugin marketplace and discovery
 */

// Unified page content (single source of truth for /plugins and settings)
export { PluginPageContent } from './plugin-page-content';

// Core plugin management
export { PluginList, PluginCard, PluginQuickActions } from './core';

// Marketplace
export { 
  PluginMarketplace, 
  PluginDetailModal,
  type MarketplacePlugin,
} from './marketplace';

// Configuration
export { PluginConfig, PluginCreateWizard } from './config';

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
