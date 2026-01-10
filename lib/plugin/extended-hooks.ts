/**
 * Extended Plugin Hooks Manager
 * 
 * Provides advanced hook management including:
 * - Priority-based hook execution
 * - Hook middleware
 * - Async hook chains
 * - Hook caching and optimization
 */

import type { PluginHooks } from '@/types/plugin';

// =============================================================================
// Types
// =============================================================================

export type HookPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest';

const PRIORITY_VALUES: Record<HookPriority, number> = {
  highest: 100,
  high: 75,
  normal: 50,
  low: 25,
  lowest: 0,
};

export interface HookRegistration<T extends (...args: unknown[]) => unknown> {
  pluginId: string;
  hook: T;
  priority: HookPriority;
  enabled: boolean;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface HookExecutionResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
  pluginId: string;
  skipped: boolean;
}

export interface HookMiddleware<T extends (...args: unknown[]) => unknown> {
  before?: (args: Parameters<T>, pluginId: string) => Parameters<T> | void;
  after?: (result: ReturnType<T>, pluginId: string) => ReturnType<T> | void;
  error?: (error: Error, pluginId: string) => void;
}

export interface ExtendedHookConfig {
  defaultTimeout: number;
  continueOnError: boolean;
  enableCaching: boolean;
  cacheTTL: number;
  maxConcurrent: number;
}

type AnyFunction = (...args: unknown[]) => unknown;

// =============================================================================
// Extended Hooks Manager
// =============================================================================

export class ExtendedHooksManager {
  private hooks: Map<string, Map<string, HookRegistration<AnyFunction>>> = new Map();
  private middleware: Map<string, HookMiddleware<AnyFunction>[]> = new Map();
  private cache: Map<string, { result: unknown; timestamp: number }> = new Map();
  private config: ExtendedHookConfig;
  private executionHistory: Array<{ hookName: string; results: HookExecutionResult<unknown>[] }> = [];

  constructor(config: Partial<ExtendedHookConfig> = {}) {
    this.config = {
      defaultTimeout: 30000,
      continueOnError: true,
      enableCaching: false,
      cacheTTL: 60000,
      maxConcurrent: 10,
      ...config,
    };
  }

  // ===========================================================================
  // Hook Registration
  // ===========================================================================

  registerHook<T extends AnyFunction>(
    hookName: string,
    pluginId: string,
    hook: T,
    options: Partial<Omit<HookRegistration<T>, 'pluginId' | 'hook'>> = {}
  ): () => void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, new Map());
    }

    const hookMap = this.hooks.get(hookName)!;
    hookMap.set(pluginId, {
      pluginId,
      hook,
      priority: options.priority || 'normal',
      enabled: options.enabled ?? true,
      timeout: options.timeout,
      metadata: options.metadata,
    });

    // Return unregister function
    return () => this.unregisterHook(hookName, pluginId);
  }

  unregisterHook(hookName: string, pluginId: string): void {
    const hookMap = this.hooks.get(hookName);
    if (hookMap) {
      hookMap.delete(pluginId);
      if (hookMap.size === 0) {
        this.hooks.delete(hookName);
      }
    }
  }

  unregisterAllHooks(pluginId: string): void {
    for (const [hookName, hookMap] of this.hooks.entries()) {
      hookMap.delete(pluginId);
      if (hookMap.size === 0) {
        this.hooks.delete(hookName);
      }
    }
  }

  registerPluginHooks(pluginId: string, hooks: PluginHooks, priority: HookPriority = 'normal'): void {
    for (const [hookName, hook] of Object.entries(hooks)) {
      if (typeof hook === 'function') {
        this.registerHook(hookName, pluginId, hook as AnyFunction, { priority });
      }
    }
  }

  // ===========================================================================
  // Middleware
  // ===========================================================================

  addMiddleware<T extends AnyFunction>(
    hookName: string,
    middleware: HookMiddleware<T>
  ): () => void {
    if (!this.middleware.has(hookName)) {
      this.middleware.set(hookName, []);
    }

    const middlewares = this.middleware.get(hookName)!;
    middlewares.push(middleware as HookMiddleware<AnyFunction>);

    return () => {
      const idx = middlewares.indexOf(middleware as HookMiddleware<AnyFunction>);
      if (idx !== -1) {
        middlewares.splice(idx, 1);
      }
    };
  }

  // ===========================================================================
  // Hook Execution
  // ===========================================================================

  async executeHook<T>(
    hookName: string,
    args: unknown[],
    options: {
      parallel?: boolean;
      stopOnFirst?: boolean;
      filter?: (pluginId: string) => boolean;
    } = {}
  ): Promise<HookExecutionResult<T>[]> {
    const hookMap = this.hooks.get(hookName);
    if (!hookMap || hookMap.size === 0) {
      return [];
    }

    // Get sorted hooks by priority
    const sortedHooks = this.getSortedHooks(hookName, options.filter);
    const middlewares = this.middleware.get(hookName) || [];

    const results: HookExecutionResult<T>[] = [];

    if (options.parallel) {
      // Execute hooks in parallel
      const promises = sortedHooks.map((reg) =>
        this.executeOneHook<T>(reg, args, middlewares)
      );
      const settled = await Promise.allSettled(promises);

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    } else {
      // Execute hooks sequentially
      for (const reg of sortedHooks) {
        const result = await this.executeOneHook<T>(reg, args, middlewares);
        results.push(result);

        if (options.stopOnFirst && result.success && result.result !== undefined) {
          break;
        }

        if (!this.config.continueOnError && !result.success) {
          break;
        }
      }
    }

    // Record execution history
    this.recordExecution(hookName, results as HookExecutionResult<unknown>[]);

    return results;
  }

  private async executeOneHook<T>(
    registration: HookRegistration<AnyFunction>,
    args: unknown[],
    middlewares: HookMiddleware<AnyFunction>[]
  ): Promise<HookExecutionResult<T>> {
    const startTime = Date.now();

    if (!registration.enabled) {
      return {
        success: true,
        pluginId: registration.pluginId,
        duration: 0,
        skipped: true,
      };
    }

    try {
      // Apply before middleware
      let processedArgs = args;
      for (const mw of middlewares) {
        if (mw.before) {
          const result = mw.before(processedArgs as Parameters<AnyFunction>, registration.pluginId);
          if (result) {
            processedArgs = result as unknown[];
          }
        }
      }

      // Execute hook with timeout
      const timeout = registration.timeout || this.config.defaultTimeout;
      let result = await this.withTimeout(
        registration.hook(...processedArgs),
        timeout,
        `Hook ${registration.pluginId} timed out`
      );

      // Apply after middleware
      for (const mw of middlewares) {
        if (mw.after) {
          const processed = mw.after(result, registration.pluginId);
          if (processed !== undefined) {
            result = processed;
          }
        }
      }

      return {
        success: true,
        result: result as T,
        duration: Date.now() - startTime,
        pluginId: registration.pluginId,
        skipped: false,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Apply error middleware
      for (const mw of middlewares) {
        if (mw.error) {
          mw.error(err, registration.pluginId);
        }
      }

      console.error(`[ExtendedHooks] Error in ${registration.pluginId}:`, err);

      return {
        success: false,
        error: err,
        duration: Date.now() - startTime,
        pluginId: registration.pluginId,
        skipped: false,
      };
    }
  }

  // ===========================================================================
  // Pipeline Execution (Transform Chain)
  // ===========================================================================

  async executePipeline<T>(
    hookName: string,
    initialValue: T,
    options: {
      filter?: (pluginId: string) => boolean;
    } = {}
  ): Promise<{ result: T; transformations: string[] }> {
    const sortedHooks = this.getSortedHooks(hookName, options.filter);
    const transformations: string[] = [];
    let currentValue = initialValue;

    for (const reg of sortedHooks) {
      if (!reg.enabled) continue;

      try {
        const result = await this.withTimeout(
          reg.hook(currentValue),
          reg.timeout || this.config.defaultTimeout,
          `Pipeline hook ${reg.pluginId} timed out`
        );

        if (result !== undefined) {
          currentValue = result as T;
          transformations.push(reg.pluginId);
        }
      } catch (error) {
        console.error(`[ExtendedHooks] Pipeline error in ${reg.pluginId}:`, error);
        if (!this.config.continueOnError) {
          throw error;
        }
      }
    }

    return { result: currentValue, transformations };
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  private getSortedHooks(
    hookName: string,
    filter?: (pluginId: string) => boolean
  ): HookRegistration<AnyFunction>[] {
    const hookMap = this.hooks.get(hookName);
    if (!hookMap) return [];

    let hooks = Array.from(hookMap.values());

    if (filter) {
      hooks = hooks.filter((h) => filter(h.pluginId));
    }

    return hooks.sort(
      (a, b) => PRIORITY_VALUES[b.priority] - PRIORITY_VALUES[a.priority]
    );
  }

  private async withTimeout<T>(
    promise: Promise<T> | T,
    timeout: number,
    message: string
  ): Promise<T> {
    if (!(promise instanceof Promise)) {
      return promise;
    }

    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(message)), timeout)
      ),
    ]);
  }

  private recordExecution(hookName: string, results: HookExecutionResult<unknown>[]): void {
    this.executionHistory.push({ hookName, results });
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-100);
    }
  }

  // ===========================================================================
  // Introspection
  // ===========================================================================

  getRegisteredHooks(hookName?: string): Map<string, string[]> {
    const result = new Map<string, string[]>();

    if (hookName) {
      const hookMap = this.hooks.get(hookName);
      if (hookMap) {
        result.set(hookName, Array.from(hookMap.keys()));
      }
    } else {
      for (const [name, hookMap] of this.hooks.entries()) {
        result.set(name, Array.from(hookMap.keys()));
      }
    }

    return result;
  }

  getHookRegistration(hookName: string, pluginId: string): HookRegistration<AnyFunction> | undefined {
    return this.hooks.get(hookName)?.get(pluginId);
  }

  setHookEnabled(hookName: string, pluginId: string, enabled: boolean): void {
    const reg = this.hooks.get(hookName)?.get(pluginId);
    if (reg) {
      reg.enabled = enabled;
    }
  }

  setHookPriority(hookName: string, pluginId: string, priority: HookPriority): void {
    const reg = this.hooks.get(hookName)?.get(pluginId);
    if (reg) {
      reg.priority = priority;
    }
  }

  getExecutionHistory(): Array<{ hookName: string; results: HookExecutionResult<unknown>[] }> {
    return [...this.executionHistory];
  }

  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  setCacheEnabled(enabled: boolean): void {
    this.config.enableCaching = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  clearCache(hookName?: string): void {
    if (hookName) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${hookName}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  clear(): void {
    this.hooks.clear();
    this.middleware.clear();
    this.cache.clear();
    this.executionHistory = [];
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let extendedHooksInstance: ExtendedHooksManager | null = null;

export function getExtendedHooksManager(
  config?: Partial<ExtendedHookConfig>
): ExtendedHooksManager {
  if (!extendedHooksInstance) {
    extendedHooksInstance = new ExtendedHooksManager(config);
  }
  return extendedHooksInstance;
}

export function resetExtendedHooksManager(): void {
  if (extendedHooksInstance) {
    extendedHooksInstance.clear();
    extendedHooksInstance = null;
  }
}
