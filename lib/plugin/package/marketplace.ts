/**
 * Plugin Marketplace Infrastructure
 * 
 * Provides plugin discovery, installation, and dependency management.
 */

import type { PluginManifest } from '@/types/plugin';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '../core/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  latestVersion: string;
  repository?: string;
  homepage?: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  categories: string[];
  manifest: PluginManifest;
  publishedAt: Date;
  updatedAt: Date;
  verified: boolean;
  featured: boolean;
}

/**
 * Plugin search options
 */
export interface PluginSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  verified?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Plugin search result
 */
export interface PluginSearchResult {
  plugins: PluginRegistryEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Plugin version info
 */
export interface PluginVersionInfo {
  version: string;
  changelog?: string;
  publishedAt: Date;
  minAppVersion?: string;
  downloadUrl: string;
  checksum?: string;
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  id: string;
  version: string;
  optional: boolean;
}

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
  resolved: boolean;
  dependencies: PluginDependency[];
  conflicts: { pluginId: string; required: string; available: string }[];
  missing: string[];
}

/**
 * Installation progress
 */
export interface InstallationProgress {
  pluginId: string;
  stage: 'downloading' | 'extracting' | 'installing' | 'configuring' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

// =============================================================================
// Plugin Marketplace Client
// =============================================================================

/**
 * Marketplace configuration
 */
export interface MarketplaceConfig {
  registryUrl: string;
  cacheTimeout: number;
  verifySignatures: boolean;
}

const DEFAULT_CONFIG: MarketplaceConfig = {
  registryUrl: 'https://plugins.cognia.app/api/v1',
  cacheTimeout: 300000, // 5 minutes
  verifySignatures: true,
};

/**
 * Plugin Marketplace Client
 */
export class PluginMarketplace {
  private config: MarketplaceConfig;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private installListeners: Map<string, (progress: InstallationProgress) => void> = new Map();

  constructor(config: Partial<MarketplaceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search for plugins
   */
  async searchPlugins(options: PluginSearchOptions = {}): Promise<PluginSearchResult> {
    const cacheKey = `search:${JSON.stringify(options)}`;
    const cached = this.getFromCache<PluginSearchResult>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (options.query) params.set('q', options.query);
      if (options.category) params.set('category', options.category);
      if (options.tags?.length) params.set('tags', options.tags.join(','));
      if (options.sortBy) params.set('sort', options.sortBy);
      if (options.sortOrder) params.set('order', options.sortOrder);
      if (options.verified !== undefined) params.set('verified', String(options.verified));
      if (options.featured !== undefined) params.set('featured', String(options.featured));
      if (options.limit) params.set('limit', String(options.limit));
      if (options.offset) params.set('offset', String(options.offset));

      const response = await proxyFetch(`${this.config.registryUrl}/plugins?${params}`);
      if (!response.ok) throw new Error('Failed to search plugins');

      const result: PluginSearchResult = await response.json();
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      loggers.marketplace.error('Search failed:', error);
      // Return empty result on error
      return { plugins: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string): Promise<PluginRegistryEntry | null> {
    const cacheKey = `plugin:${pluginId}`;
    const cached = this.getFromCache<PluginRegistryEntry>(cacheKey);
    if (cached) return cached;

    try {
      const response = await proxyFetch(`${this.config.registryUrl}/plugins/${pluginId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to get plugin');
      }

      const plugin: PluginRegistryEntry = await response.json();
      this.setCache(cacheKey, plugin);
      return plugin;
    } catch (error) {
      loggers.marketplace.error('Get plugin failed:', error);
      return null;
    }
  }

  /**
   * Get available versions for a plugin
   */
  async getVersions(pluginId: string): Promise<PluginVersionInfo[]> {
    const cacheKey = `versions:${pluginId}`;
    const cached = this.getFromCache<PluginVersionInfo[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await proxyFetch(`${this.config.registryUrl}/plugins/${pluginId}/versions`);
      if (!response.ok) throw new Error('Failed to get versions');

      const versions: PluginVersionInfo[] = await response.json();
      this.setCache(cacheKey, versions);
      return versions;
    } catch (error) {
      loggers.marketplace.error('Get versions failed:', error);
      return [];
    }
  }

  /**
   * Get featured plugins
   */
  async getFeaturedPlugins(): Promise<PluginRegistryEntry[]> {
    const result = await this.searchPlugins({ featured: true, limit: 10 });
    return result.plugins;
  }

  /**
   * Get popular plugins
   */
  async getPopularPlugins(limit = 10): Promise<PluginRegistryEntry[]> {
    const result = await this.searchPlugins({ sortBy: 'downloads', sortOrder: 'desc', limit });
    return result.plugins;
  }

  /**
   * Get recently updated plugins
   */
  async getRecentPlugins(limit = 10): Promise<PluginRegistryEntry[]> {
    const result = await this.searchPlugins({ sortBy: 'updated', sortOrder: 'desc', limit });
    return result.plugins;
  }

  /**
   * Get plugin categories
   */
  async getCategories(): Promise<{ id: string; name: string; count: number }[]> {
    const cacheKey = 'categories';
    const cached = this.getFromCache<{ id: string; name: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await proxyFetch(`${this.config.registryUrl}/categories`);
      if (!response.ok) throw new Error('Failed to get categories');

      const categories = await response.json();
      this.setCache(cacheKey, categories);
      return categories;
    } catch (error) {
      loggers.marketplace.error('Get categories failed:', error);
      return [];
    }
  }

  /**
   * Resolve dependencies for a plugin
   */
  async resolveDependencies(pluginId: string, _version?: string): Promise<DependencyResolutionResult> {
    try {
      const plugin = await this.getPlugin(pluginId);
      if (!plugin) {
        return {
          resolved: false,
          dependencies: [],
          conflicts: [],
          missing: [pluginId],
        };
      }

      const dependencies: PluginDependency[] = [];
      const conflicts: { pluginId: string; required: string; available: string }[] = [];
      const missing: string[] = [];

      // Check manifest dependencies
      if (plugin.manifest.dependencies) {
        for (const [depId, depVersion] of Object.entries(plugin.manifest.dependencies)) {
          const depPlugin = await this.getPlugin(depId);
          if (!depPlugin) {
            missing.push(depId);
          } else {
            // Simple version check - in production would use semver
            if (!this.isVersionCompatible(depVersion, depPlugin.latestVersion)) {
              conflicts.push({
                pluginId: depId,
                required: depVersion,
                available: depPlugin.latestVersion,
              });
            } else {
              dependencies.push({
                id: depId,
                version: depPlugin.latestVersion,
                optional: false,
              });
            }
          }
        }
      }

      return {
        resolved: missing.length === 0 && conflicts.length === 0,
        dependencies,
        conflicts,
        missing,
      };
    } catch (error) {
      loggers.marketplace.error('Resolve dependencies failed:', error);
      return {
        resolved: false,
        dependencies: [],
        conflicts: [],
        missing: [pluginId],
      };
    }
  }

  /**
   * Subscribe to installation progress
   */
  onInstallProgress(pluginId: string, listener: (progress: InstallationProgress) => void): () => void {
    this.installListeners.set(pluginId, listener);
    return () => {
      this.installListeners.delete(pluginId);
    };
  }

  /**
   * Emit installation progress
   */
  private emitProgress(progress: InstallationProgress) {
    const listener = this.installListeners.get(progress.pluginId);
    if (listener) {
      listener(progress);
    }
  }

  /**
   * Install a plugin from the marketplace
   */
  async installPlugin(
    pluginId: string, 
    version?: string,
    options: { installDependencies?: boolean } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Emit initial progress
      this.emitProgress({
        pluginId,
        stage: 'downloading',
        progress: 0,
        message: 'Starting download...',
      });

      // Resolve dependencies first
      if (options.installDependencies !== false) {
        const deps = await this.resolveDependencies(pluginId, version);
        if (!deps.resolved) {
          return {
            success: false,
            error: `Dependency resolution failed: Missing: ${deps.missing.join(', ')}`,
          };
        }

        // Install dependencies first
        for (const dep of deps.dependencies) {
          const depResult = await this.installPlugin(dep.id, dep.version, { 
            installDependencies: false 
          });
          if (!depResult.success) {
            return {
              success: false,
              error: `Failed to install dependency ${dep.id}: ${depResult.error}`,
            };
          }
        }
      }

      // Get plugin info
      const plugin = await this.getPlugin(pluginId);
      if (!plugin) {
        return { success: false, error: 'Plugin not found' };
      }

      // Get version info
      const versions = await this.getVersions(pluginId);
      const targetVersion = version 
        ? versions.find(v => v.version === version)
        : versions[0];

      if (!targetVersion) {
        return { success: false, error: 'Version not found' };
      }

      this.emitProgress({
        pluginId,
        stage: 'downloading',
        progress: 30,
        message: `Downloading ${plugin.name} v${targetVersion.version}...`,
      });

      // Download plugin
      // In a real implementation, this would download and install the plugin
      // For now, we simulate the process
      await this.simulateDownload(pluginId);

      this.emitProgress({
        pluginId,
        stage: 'extracting',
        progress: 60,
        message: 'Extracting plugin files...',
      });

      await this.delay(500);

      this.emitProgress({
        pluginId,
        stage: 'installing',
        progress: 80,
        message: 'Installing plugin...',
      });

      await this.delay(500);

      this.emitProgress({
        pluginId,
        stage: 'configuring',
        progress: 90,
        message: 'Configuring plugin...',
      });

      await this.delay(300);

      this.emitProgress({
        pluginId,
        stage: 'complete',
        progress: 100,
        message: 'Installation complete!',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Installation failed';
      this.emitProgress({
        pluginId,
        stage: 'error',
        progress: 0,
        message: errorMessage,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(
    installedPlugins: { id: string; version: string }[]
  ): Promise<{ id: string; currentVersion: string; latestVersion: string }[]> {
    const updates: { id: string; currentVersion: string; latestVersion: string }[] = [];

    for (const installed of installedPlugins) {
      const plugin = await this.getPlugin(installed.id);
      if (plugin && plugin.latestVersion !== installed.version) {
        updates.push({
          id: installed.id,
          currentVersion: installed.version,
          latestVersion: plugin.latestVersion,
        });
      }
    }

    return updates;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private isVersionCompatible(required: string, available: string): boolean {
    // Simple version comparison - in production would use semver
    // For now, just check if available version is >= required
    const reqParts = required.replace(/[^0-9.]/g, '').split('.').map(Number);
    const avaParts = available.replace(/[^0-9.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(reqParts.length, avaParts.length); i++) {
      const req = reqParts[i] || 0;
      const ava = avaParts[i] || 0;
      if (ava > req) return true;
      if (ava < req) return false;
    }
    return true;
  }

  private async simulateDownload(_pluginId: string): Promise<void> {
    // Simulate download with progress
    for (let i = 0; i < 3; i++) {
      await this.delay(200);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let marketplaceInstance: PluginMarketplace | null = null;

/**
 * Get the marketplace instance
 */
export function getPluginMarketplace(config?: Partial<MarketplaceConfig>): PluginMarketplace {
  if (!marketplaceInstance) {
    marketplaceInstance = new PluginMarketplace(config);
  }
  return marketplaceInstance;
}

/**
 * Reset the marketplace instance
 */
export function resetPluginMarketplace() {
  marketplaceInstance = null;
}

// =============================================================================
// React Hook
// =============================================================================

/**
 * Hook to access the marketplace
 */
export function usePluginMarketplace(): PluginMarketplace {
  return getPluginMarketplace();
}
