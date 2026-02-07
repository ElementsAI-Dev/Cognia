/**
 * Plugin Loader - Handles loading plugin modules dynamically
 */

import type { Plugin, PluginDefinition, PluginManifest } from '@/types/plugin';

// =============================================================================
// Types
// =============================================================================

interface LoadedModule {
  definition: PluginDefinition;
  exports: Record<string, unknown>;
}

// =============================================================================
// Plugin Loader
// =============================================================================

export class PluginLoader {
  private loadedModules: Map<string, LoadedModule> = new Map();
  private loadingPromises: Map<string, Promise<PluginDefinition>> = new Map();

  /**
   * Load a plugin module
   */
  async load(plugin: Plugin): Promise<PluginDefinition> {
    const pluginId = plugin.manifest.id;

    // Return cached if already loaded
    if (this.loadedModules.has(pluginId)) {
      return this.loadedModules.get(pluginId)!.definition;
    }

    // Return existing loading promise to avoid duplicate loads
    if (this.loadingPromises.has(pluginId)) {
      return this.loadingPromises.get(pluginId)!;
    }

    // Create loading promise
    const loadPromise = this.loadModule(plugin);
    this.loadingPromises.set(pluginId, loadPromise);

    try {
      const definition = await loadPromise;
      return definition;
    } finally {
      this.loadingPromises.delete(pluginId);
    }
  }

  /**
   * Load a plugin module based on type
   */
  private async loadModule(plugin: Plugin): Promise<PluginDefinition> {
    const { manifest, path } = plugin;

    switch (manifest.type) {
      case 'frontend':
        return this.loadFrontendModule(manifest, path);
      case 'python':
        return this.loadPythonModule(manifest, path);
      case 'hybrid':
        return this.loadHybridModule(manifest, path);
      default:
        throw new Error(`Unknown plugin type: ${manifest.type}`);
    }
  }

  /**
   * Load a frontend (JavaScript/TypeScript) plugin
   */
  private async loadFrontendModule(
    manifest: PluginManifest,
    pluginPath: string
  ): Promise<PluginDefinition> {
    if (!manifest.main) {
      throw new Error(`Frontend plugin ${manifest.id} missing 'main' entry point`);
    }

    try {
      // Dynamic import of the plugin module
      // In production, plugins would be bundled and served from a known location
      const modulePath = `${pluginPath}/${manifest.main}`;
      
      // Use dynamic import with error handling
      // Note: In Tauri, we may need to use a different approach
      // such as loading via fetch and eval, or using a plugin bundler
      const moduleExports = await this.importModule(modulePath);

      // Extract the plugin definition
      const definition = this.extractDefinition(moduleExports, manifest);

      // Cache the loaded module
      this.loadedModules.set(manifest.id, {
        definition,
        exports: moduleExports as Record<string, unknown>,
      });

      return definition;
    } catch (error) {
      throw new Error(`Failed to load frontend plugin ${manifest.id}: ${error}`);
    }
  }

  /**
   * Load a Python plugin (stub - actual loading via PyO3 in Tauri)
   */
  private async loadPythonModule(
    manifest: PluginManifest,
    _pluginPath: string
  ): Promise<PluginDefinition> {
    // Python plugins are loaded via Tauri/PyO3
    // Return a minimal definition that delegates to the Python runtime
    return {
      manifest,
      activate: async (context) => {
        // The actual Python activation is handled by PluginManager.loadPythonPlugin
        context.logger.info(`Python plugin ${manifest.id} activated`);
        return {};
      },
      deactivate: async () => {
        // Cleanup is handled by PluginManager
      },
    };
  }

  /**
   * Load a hybrid plugin (both frontend and Python)
   */
  private async loadHybridModule(
    manifest: PluginManifest,
    pluginPath: string
  ): Promise<PluginDefinition> {
    // Load frontend part if exists
    let frontendDefinition: PluginDefinition | null = null;
    if (manifest.main) {
      frontendDefinition = await this.loadFrontendModule(manifest, pluginPath);
    }

    // Return combined definition
    return {
      manifest,
      activate: async (context) => {
        // Activate frontend part
        let frontendHooks = {};
        if (frontendDefinition) {
          const result = await frontendDefinition.activate(context);
          if (result) {
            frontendHooks = result;
          }
        }

        // Python part will be loaded separately by PluginManager
        context.logger.info(`Hybrid plugin ${manifest.id} frontend activated`);

        return frontendHooks;
      },
      deactivate: async () => {
        if (frontendDefinition?.deactivate) {
          await frontendDefinition.deactivate();
        }
      },
    };
  }

  /**
   * Import a module dynamically
   * 
   * In Tauri, file system paths cannot be used directly as script src.
   * We use multiple strategies:
   * 1. Tauri asset protocol (convertFileSrc) for loading bundled plugins
   * 2. Fetch + eval for loading plugin code from the file system
   * 3. Script tag with blob URL as fallback
   */
  private async importModule(modulePath: string): Promise<unknown> {
    // Strategy 1: Try Tauri asset protocol if available
    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      const assetUrl = convertFileSrc(modulePath);
      return await this.loadViaFetch(assetUrl, modulePath);
    } catch {
      // Tauri not available or convertFileSrc failed
    }

    // Strategy 2: Try fetch + eval with file:// protocol or direct path
    try {
      return await this.loadViaFetch(modulePath, modulePath);
    } catch {
      // Fetch failed
    }

    // Strategy 3: Fallback to script tag with blob URL
    return this.loadAsScript(modulePath);
  }

  /**
   * Load module by fetching its content and evaluating it
   */
  private async loadViaFetch(url: string, originalPath: string): Promise<unknown> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin: ${response.status} ${response.statusText}`);
    }

    const code = await response.text();

    // Create a module-like environment for the plugin
    const pluginExports: Record<string, unknown> = {};
    const pluginModule: { exports: Record<string, unknown> } = { exports: pluginExports };

    // Wrap the plugin code in a function to provide module/exports
    const wrappedCode = `(function(module, exports, require) { ${code} })`;

    try {
      const factory = (0, eval)(wrappedCode);
      factory(pluginModule, pluginExports, () => {
        throw new Error(`require() is not supported in plugins. Use ES module imports in your build. Path: ${originalPath}`);
      });

      // Return either module.exports or the exports object
      return pluginModule.exports !== pluginExports ? pluginModule.exports : pluginExports;
    } catch (error) {
      throw new Error(`Failed to evaluate plugin code from ${originalPath}: ${error}`);
    }
  }

  /**
   * Load module as script tag with blob URL (fallback)
   */
  private async loadAsScript(modulePath: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Create a unique global variable name for the plugin to export to
      const exportVar = `__pluginExport_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Set up the global receiver
      (window as unknown as Record<string, unknown>)[exportVar] = undefined;

      // For script tag loading, the plugin must call window[exportVar] = { activate, deactivate }
      // or assign to window.__cognia_plugin
      const checkExport = () => {
        const result = (window as unknown as Record<string, unknown>)[exportVar] 
          || (window as unknown as Record<string, unknown>).__cognia_plugin;
        delete (window as unknown as Record<string, unknown>)[exportVar];
        delete (window as unknown as Record<string, unknown>).__cognia_plugin;
        return result;
      };

      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      
      // Try to convert file path to asset URL for Tauri
      script.src = modulePath;
      script.onload = () => {
        const result = checkExport();
        if (result) {
          resolve(result);
        } else {
          reject(new Error(`Plugin loaded but did not export anything: ${modulePath}`));
        }
        script.remove();
      };
      script.onerror = () => {
        checkExport();
        reject(new Error(`Failed to load script: ${modulePath}`));
        script.remove();
      };

      document.head.appendChild(script);

      // Timeout after 30 seconds
      setTimeout(() => {
        const result = checkExport();
        if (!result) {
          reject(new Error(`Timeout loading script: ${modulePath}`));
          script.remove();
        }
      }, 30000);
    });
  }

  /**
   * Extract plugin definition from module exports
   */
  private extractDefinition(
    moduleExports: unknown,
    manifest: PluginManifest
  ): PluginDefinition {
    const exports = moduleExports as Record<string, unknown>;

    // Check for default export
    if (exports.default && this.isPluginDefinition(exports.default)) {
      return exports.default as PluginDefinition;
    }

    // Check for named 'plugin' export
    if (exports.plugin && this.isPluginDefinition(exports.plugin)) {
      return exports.plugin as PluginDefinition;
    }

    // Check for 'activate' function export
    if (typeof exports.activate === 'function') {
      return {
        manifest,
        activate: exports.activate as PluginDefinition['activate'],
        deactivate: exports.deactivate as PluginDefinition['deactivate'],
      };
    }

    throw new Error(`Plugin ${manifest.id} does not export a valid plugin definition`);
  }

  /**
   * Check if an object is a valid plugin definition
   */
  private isPluginDefinition(obj: unknown): obj is PluginDefinition {
    if (typeof obj !== 'object' || obj === null) return false;
    const def = obj as Record<string, unknown>;
    return typeof def.activate === 'function' || typeof def.manifest === 'object';
  }

  /**
   * Unload a plugin module
   */
  unload(pluginId: string): void {
    this.loadedModules.delete(pluginId);
    this.loadingPromises.delete(pluginId);
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    return this.loadedModules.has(pluginId);
  }

  /**
   * Get loaded module exports
   */
  getModuleExports(pluginId: string): Record<string, unknown> | undefined {
    return this.loadedModules.get(pluginId)?.exports;
  }

  /**
   * Clear all loaded modules
   */
  clear(): void {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}
