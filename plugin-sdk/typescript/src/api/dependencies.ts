/**
 * Dependency Management API
 *
 * @description Manage plugin dependencies and inter-plugin communication.
 */

/**
 * Dependency specification
 */
export interface DependencySpec {
  /** Plugin ID */
  pluginId: string;
  /** Version constraint */
  version: string;
  /** Whether dependency is optional */
  optional?: boolean;
}

/**
 * Resolved dependency
 */
export interface ResolvedDependency {
  /** Plugin ID */
  pluginId: string;
  /** Required version constraint */
  requiredVersion: string;
  /** Actually resolved version */
  resolvedVersion: string;
  /** Whether dependency is satisfied */
  satisfied: boolean;
  /** Whether plugin is loaded */
  loaded: boolean;
  /** Whether plugin is enabled */
  enabled: boolean;
  /** Error if not satisfied */
  error?: string;
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  /** Plugin ID */
  pluginId: string;
  /** Plugin version */
  version: string;
  /** Direct dependencies */
  dependencies: string[];
  /** Plugins that depend on this one */
  dependents: string[];
  /** Load order (lower = load first) */
  loadOrder: number;
}

/**
 * Dependency conflict
 */
export interface DependencyConflict {
  /** Conflicting plugin ID */
  pluginId: string;
  /** Required by */
  requiredBy: Array<{ pluginId: string; version: string }>;
  /** Conflict description */
  description: string;
}

/**
 * Dependency check result
 */
export interface DependencyCheckResult {
  /** Whether all dependencies are satisfied */
  satisfied: boolean;
  /** Resolved dependencies */
  resolved: ResolvedDependency[];
  /** Missing dependencies */
  missing: DependencySpec[];
  /** Version conflicts */
  conflicts: DependencyConflict[];
  /** Circular dependencies detected */
  circular: string[][];
}

/**
 * Dependency Management API
 *
 * @remarks
 * Provides dependency management for plugins:
 * - Declare and resolve dependencies
 * - Check dependency satisfaction
 * - Access dependent plugin APIs
 * - Build dependency graphs
 *
 * @example
 * ```typescript
 * // Check dependencies
 * const check = await context.dependencies.check();
 * if (!check.satisfied) {
 *   console.log('Missing:', check.missing);
 *   console.log('Conflicts:', check.conflicts);
 * }
 *
 * // Access a dependency's API
 * const otherPlugin = context.dependencies.getAPI('other-plugin');
 * const result = await otherPlugin?.doSomething();
 *
 * // Get dependency graph
 * const graph = context.dependencies.getGraph();
 * ```
 */
export interface PluginDependencyAPI {
  /**
   * Check if all dependencies are satisfied
   */
  check(): Promise<DependencyCheckResult>;

  /**
   * Get declared dependencies
   */
  getDeclared(): DependencySpec[];

  /**
   * Get resolved dependencies
   */
  getResolved(): ResolvedDependency[];

  /**
   * Check if a specific dependency is available
   */
  has(pluginId: string): boolean;

  /**
   * Check if a specific version is available
   */
  hasVersion(pluginId: string, version: string): boolean;

  /**
   * Get a dependency's exported API
   */
  getAPI<T = unknown>(pluginId: string): T | null;

  /**
   * Wait for a dependency to be loaded
   */
  waitFor(pluginId: string, timeout?: number): Promise<boolean>;

  /**
   * Get dependency graph
   */
  getGraph(): DependencyNode[];

  /**
   * Get load order
   */
  getLoadOrder(): string[];

  /**
   * Get plugins that depend on this plugin
   */
  getDependents(): string[];

  /**
   * Register API to expose to dependents
   */
  exposeAPI<T>(api: T): void;

  /**
   * Listen for dependency loaded event
   */
  onDependencyLoaded(pluginId: string, handler: () => void): () => void;

  /**
   * Listen for dependency unloaded event
   */
  onDependencyUnloaded(pluginId: string, handler: () => void): () => void;

  /**
   * Request installation of missing dependencies
   */
  requestInstall(dependencies: DependencySpec[]): Promise<boolean>;
}
