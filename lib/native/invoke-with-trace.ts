/**
 * Invoke With Trace
 * 
 * Wrapper for Tauri invoke that automatically injects trace IDs
 * for request correlation between frontend and backend logs.
 */

import { loggers, logContext } from '@/lib/logger';
import { isTauri } from '@/lib/utils';

/**
 * Invoke a Tauri command with automatic trace ID injection
 * 
 * @param cmd - The Tauri command name to invoke
 * @param args - Optional arguments to pass to the command
 * @returns Promise resolving to the command result
 * 
 * @example
 * ```typescript
 * const result = await invokeWithTrace<string>('get_file_content', { path: '/foo' });
 * ```
 */
export async function invokeWithTrace<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauri()) {
    throw new Error('invokeWithTrace can only be used in Tauri environment');
  }

  const { invoke } = await import('@tauri-apps/api/core');
  
  // Generate or use existing trace ID
  const traceId = logContext.traceId || logContext.newTraceId();
  
  loggers.native.debug(`Invoking ${cmd}`, { traceId, args: args ? Object.keys(args) : [] });
  
  const startTime = performance.now();
  
  try {
    const result = await invoke<T>(cmd, {
      ...args,
      __trace_id: traceId,
    });
    
    const duration = performance.now() - startTime;
    loggers.native.debug(`${cmd} completed`, { traceId, durationMs: duration.toFixed(2) });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    loggers.native.error(`${cmd} failed`, error as Error, { 
      traceId, 
      durationMs: duration.toFixed(2),
      args: args ? Object.keys(args) : [],
    });
    throw error;
  }
}

/**
 * Create a traced invoke function for a specific command
 * Useful for creating type-safe command wrappers
 * 
 * @example
 * ```typescript
 * const getFileContent = createTracedInvoke<{ path: string }, string>('get_file_content');
 * const content = await getFileContent({ path: '/foo' });
 * ```
 */
export function createTracedInvoke<TArgs extends Record<string, unknown>, TResult>(
  cmd: string
): (args?: TArgs) => Promise<TResult> {
  return (args?: TArgs) => invokeWithTrace<TResult>(cmd, args);
}

/**
 * Batch invoke multiple commands with the same trace ID
 * All commands share the same trace context for easier debugging
 * 
 * @example
 * ```typescript
 * const [files, config] = await batchInvokeWithTrace([
 *   { cmd: 'list_files', args: { dir: '/foo' } },
 *   { cmd: 'get_config' },
 * ]);
 * ```
 */
export async function batchInvokeWithTrace<T extends unknown[]>(
  commands: Array<{ cmd: string; args?: Record<string, unknown> }>
): Promise<T> {
  if (!isTauri()) {
    throw new Error('batchInvokeWithTrace can only be used in Tauri environment');
  }

  const { invoke } = await import('@tauri-apps/api/core');
  
  // Use single trace ID for entire batch
  const traceId = logContext.traceId || logContext.newTraceId();
  
  loggers.native.debug(`Batch invoking ${commands.length} commands`, { 
    traceId, 
    commands: commands.map(c => c.cmd),
  });
  
  const startTime = performance.now();
  
  try {
    const results = await Promise.all(
      commands.map(({ cmd, args }) =>
        invoke(cmd, { ...args, __trace_id: traceId })
      )
    );
    
    const duration = performance.now() - startTime;
    loggers.native.debug(`Batch completed`, { 
      traceId, 
      durationMs: duration.toFixed(2),
      count: commands.length,
    });
    
    return results as T;
  } catch (error) {
    const duration = performance.now() - startTime;
    loggers.native.error(`Batch invoke failed`, error as Error, { 
      traceId, 
      durationMs: duration.toFixed(2),
      commands: commands.map(c => c.cmd),
    });
    throw error;
  }
}

/**
 * Execute a function within a traced context
 * Automatically manages trace ID lifecycle
 * 
 * @example
 * ```typescript
 * const result = await withTrace(async () => {
 *   const files = await invoke('list_files');
 *   const processed = await invoke('process_files', { files });
 *   return processed;
 * });
 * ```
 */
export async function withTrace<T>(fn: () => Promise<T>): Promise<T> {
  const previousTraceId = logContext.traceId;
  const traceId = logContext.newTraceId();
  
  loggers.native.debug('Starting traced operation', { traceId });
  
  try {
    const result = await fn();
    loggers.native.debug('Traced operation completed', { traceId });
    return result;
  } catch (error) {
    loggers.native.error('Traced operation failed', error as Error, { traceId });
    throw error;
  } finally {
    // Restore previous trace ID or clear
    if (previousTraceId) {
      logContext.setTraceId(previousTraceId);
    } else {
      logContext.clearTraceId();
    }
  }
}
