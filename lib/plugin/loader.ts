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
   */
  private async importModule(modulePath: string): Promise<unknown> {
    // In a browser/Tauri environment, we need special handling
    // Option 1: Use eval with fetched code (security concerns)
    // Option 2: Use a bundler to create runtime-loadable modules
    // Option 3: Use a plugin sandbox with postMessage
    
    // For now, attempt standard dynamic import
    // In production, this would be replaced with a more robust solution
    try {
      // Try dynamic import first (works for ESM modules)
      return await import(/* @vite-ignore */ modulePath);
    } catch {
      // Fallback: try loading as a script
      return this.loadAsScript(modulePath);
    }
  }

  /**
   * Load module as script (fallback)
   */
  private async loadAsScript(modulePath: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Create a unique callback name
      const callbackName = `__pluginCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Set up callback
      (window as unknown as Record<string, unknown>)[callbackName] = (exports: unknown) => {
        delete (window as unknown as Record<string, unknown>)[callbackName];
        resolve(exports);
      };

      // Create script element
      const script = document.createElement('script');
      script.type = 'module';
      script.src = modulePath;
      script.onerror = () => {
        delete (window as unknown as Record<string, unknown>)[callbackName];
        reject(new Error(`Failed to load script: ${modulePath}`));
      };

      document.head.appendChild(script);

      // Timeout after 30 seconds
      setTimeout(() => {
        if ((window as unknown as Record<string, unknown>)[callbackName]) {
          delete (window as unknown as Record<string, unknown>)[callbackName];
          reject(new Error(`Timeout loading script: ${modulePath}`));
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
