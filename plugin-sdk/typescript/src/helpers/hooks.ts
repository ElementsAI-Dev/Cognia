/**
 * Hook Composition Helpers
 *
 * @description Utilities for composing, merging, and defining plugin hooks.
 * Simplifies creating complex hook configurations with type safety.
 */

import type { PluginHooksAll } from '../hooks/extended';

/**
 * Compose multiple hook objects into a single hooks object.
 * When multiple hooks define the same event, they are chained in order.
 *
 * @example
 * ```typescript
 * const loggingHooks = defineHooks({
 *   onMessageSend: (message) => {
 *     console.log('Message sent:', message.content);
 *   },
 * });
 *
 * const analyticsHooks = defineHooks({
 *   onMessageSend: (message) => {
 *     trackEvent('message_sent', { length: message.content.length });
 *   },
 *   onSessionCreate: (session) => {
 *     trackEvent('session_created', { id: session.id });
 *   },
 * });
 *
 * // Both onMessageSend handlers will run in order
 * export default definePlugin({
 *   activate: () => composeHooks(loggingHooks, analyticsHooks),
 * });
 * ```
 */
export function composeHooks(...hookSets: Partial<PluginHooksAll>[]): Partial<PluginHooksAll> {
  const composed: Record<string, unknown> = {};

  for (const hooks of hookSets) {
    for (const [key, handler] of Object.entries(hooks)) {
      if (typeof handler !== 'function') continue;

      const existing = composed[key];
      if (typeof existing === 'function') {
        // Chain handlers: run existing first, then new
        composed[key] = async (...args: unknown[]) => {
          await (existing as (...a: unknown[]) => unknown)(...args);
          return (handler as (...a: unknown[]) => unknown)(...args);
        };
      } else {
        composed[key] = handler;
      }
    }
  }

  return composed as Partial<PluginHooksAll>;
}

/**
 * Type-safe helper to define a partial hooks object.
 * Provides autocomplete and type checking without requiring all hooks.
 *
 * @example
 * ```typescript
 * const hooks = defineHooks({
 *   onMessageSend: (message) => {
 *     // Full type inference for message parameter
 *     console.log(message.content);
 *   },
 *   onSessionCreate: (session) => {
 *     console.log('New session:', session.id);
 *   },
 * });
 * ```
 */
export function defineHooks(hooks: Partial<PluginHooksAll>): Partial<PluginHooksAll> {
  return hooks;
}

/**
 * Create a conditional hook that only executes when the condition is met.
 *
 * @example
 * ```typescript
 * const debugHook = conditionalHook(
 *   () => localStorage.getItem('debug') === 'true',
 *   {
 *     onMessageSend: (message) => {
 *       console.debug('DEBUG: Message sent', message);
 *     },
 *   }
 * );
 * ```
 */
export function conditionalHook(
  condition: () => boolean,
  hooks: Partial<PluginHooksAll>
): Partial<PluginHooksAll> {
  const wrapped: Record<string, unknown> = {};

  for (const [key, handler] of Object.entries(hooks)) {
    if (typeof handler !== 'function') continue;

    wrapped[key] = (...args: unknown[]) => {
      if (condition()) {
        return (handler as (...a: unknown[]) => unknown)(...args);
      }
    };
  }

  return wrapped as Partial<PluginHooksAll>;
}

/**
 * Create a debounced version of hooks that fire frequently.
 * Useful for hooks like onMessageEdit or onCanvasUpdate.
 *
 * @param hooks - The hooks to debounce
 * @param delay - Debounce delay in milliseconds (default: 300)
 *
 * @example
 * ```typescript
 * const debouncedHooks = debouncedHook({
 *   onMessageEdit: (id, content) => {
 *     // Only fires after 500ms of inactivity
 *     saveToAnalytics(id, content);
 *   },
 * }, 500);
 * ```
 */
export function debouncedHook(
  hooks: Partial<PluginHooksAll>,
  delay = 300
): Partial<PluginHooksAll> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const wrapped: Record<string, unknown> = {};

  for (const [key, handler] of Object.entries(hooks)) {
    if (typeof handler !== 'function') continue;

    wrapped[key] = (...args: unknown[]) => {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);

      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          (handler as (...a: unknown[]) => unknown)(...args);
        }, delay)
      );
    };
  }

  return wrapped as Partial<PluginHooksAll>;
}
