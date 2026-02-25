/**
 * Sandbox Database API - Native Tauri bindings for sandbox database operations
 *
 * This module provides TypeScript wrappers for the Rust sandbox database backend,
 * including execution history, code snippets, sessions, and statistics.
 */

import type {
  CodeSnippet,
  CreateSnippetRequest,
  DailyExecutionCount,
  ExecutionFilter,
  SandboxExecutionRecord,
  ExecutionRequest,
  SandboxExecutionResult,
  ExecutionSession,
  Language,
  LanguageStats,
  RuntimeType,
  BackendSandboxConfig,
  SandboxStats,
  SandboxStatus,
  SnippetFilter,
} from '@/types/system/sandbox';
import {
  cancelExecution as coreCancelExecution,
  checkRuntime as coreCheckRuntime,
  executeCodeStreaming as coreExecuteCodeStreaming,
  cleanupSandbox as coreCleanupSandbox,
  deleteSession as coreDeleteSession,
  endSession as coreEndSession,
  executeCode as coreExecuteCode,
  executeCodeWithOptions as coreExecuteCodeWithOptions,
  executeWithLimits as coreExecuteWithLimits,
  executeWithStdin as coreExecuteWithStdin,
  getAvailableRuntimes as coreGetAvailableRuntimes,
  getBackendSandboxConfig as coreGetBackendSandboxConfig,
  getCurrentSession as coreGetCurrentSession,
  getRuntimeInfo as coreGetRuntimeInfo,
  getSandboxStatus as coreGetSandboxStatus,
  getSession as coreGetSession,
  getSessionExecutions as coreGetSessionExecutions,
  getSupportedLanguages as coreGetSupportedLanguages,
  invokeSandboxCommand,
  listSessions as coreListSessions,
  prepareLanguage as corePrepareLanguage,
  quickExecute as coreQuickExecute,
  setCurrentSession as coreSetCurrentSession,
  setDefaultMemoryLimit as coreSetDefaultMemoryLimit,
  setDefaultTimeout as coreSetDefaultTimeout,
  setNetworkEnabled as coreSetNetworkEnabled,
  setPreferredRuntime as coreSetPreferredRuntime,
  startSession as coreStartSession,
  toggleLanguage as coreToggleLanguage,
  updateBackendSandboxConfig as coreUpdateBackendSandboxConfig,
  updateSession as coreUpdateSession,
} from './sandbox-core';

// ==================== Execution ====================

/**
 * Execute code in the sandbox
 */
export async function executeCode(
  request: ExecutionRequest
): Promise<SandboxExecutionResult> {
  return coreExecuteCode(request);
}

/**
 * Cancel a running execution by its ID
 */
export async function cancelExecution(executionId: string): Promise<boolean> {
  return coreCancelExecution(executionId);
}

/**
 * Execute code with streaming output (emits "sandbox-output-line" Tauri events)
 */
export async function executeCodeStreaming(
  request: ExecutionRequest
): Promise<SandboxExecutionResult> {
  return coreExecuteCodeStreaming(request);
}

/**
 * Execute code with custom options
 */
export async function executeCodeWithOptions(
  request: ExecutionRequest,
  tags: string[] = [],
  saveToHistory: boolean = true
): Promise<SandboxExecutionResult> {
  return coreExecuteCodeWithOptions(request, tags, saveToHistory);
}

/**
 * Quick execute - simplified execution
 */
export async function quickExecute(
  language: string,
  code: string
): Promise<SandboxExecutionResult> {
  return coreQuickExecute(language, code);
}

/**
 * Execute with stdin
 */
export async function executeWithStdin(
  language: string,
  code: string,
  stdin: string
): Promise<SandboxExecutionResult> {
  return coreExecuteWithStdin(language, code, stdin);
}

/**
 * Execute with specific limits
 */
export async function executeWithLimits(
  language: string,
  code: string,
  timeoutSecs: number,
  memoryMb: number
): Promise<SandboxExecutionResult> {
  return coreExecuteWithLimits(language, code, timeoutSecs, memoryMb);
}

// ==================== Configuration ====================

/**
 * Get sandbox status
 */
export async function getSandboxStatus(): Promise<SandboxStatus> {
  return coreGetSandboxStatus();
}

/**
 * Get sandbox configuration
 */
export async function getBackendSandboxConfig(): Promise<BackendSandboxConfig> {
  return coreGetBackendSandboxConfig();
}

/**
 * Update sandbox configuration
 */
export async function updateBackendSandboxConfig(
  config: BackendSandboxConfig
): Promise<void> {
  return coreUpdateBackendSandboxConfig(config);
}

/**
 * Get available runtimes
 */
export async function getAvailableRuntimes(): Promise<RuntimeType[]> {
  return coreGetAvailableRuntimes();
}

/**
 * Get supported languages
 */
export async function getSupportedLanguages(): Promise<Language[]> {
  return coreGetSupportedLanguages();
}

/**
 * Check if a runtime is available
 */
export async function checkRuntime(runtime: RuntimeType): Promise<boolean> {
  return coreCheckRuntime(runtime);
}

/**
 * Set preferred runtime
 */
export async function setPreferredRuntime(runtime: RuntimeType): Promise<void> {
  return coreSetPreferredRuntime(runtime);
}

/**
 * Set default timeout
 */
export async function setDefaultTimeout(timeoutSecs: number): Promise<void> {
  return coreSetDefaultTimeout(timeoutSecs);
}

/**
 * Set default memory limit
 */
export async function setDefaultMemoryLimit(memoryMb: number): Promise<void> {
  return coreSetDefaultMemoryLimit(memoryMb);
}

/**
 * Set network access
 */
export async function setNetworkEnabled(enabled: boolean): Promise<void> {
  return coreSetNetworkEnabled(enabled);
}

/**
 * Toggle language enabled/disabled
 */
export async function toggleLanguage(
  language: string,
  enabled: boolean
): Promise<void> {
  return coreToggleLanguage(language, enabled);
}

/**
 * Prepare/pull image for a language
 */
export async function prepareLanguage(language: string): Promise<void> {
  return corePrepareLanguage(language);
}

/**
 * Get runtime info
 */
export async function getRuntimeInfo(
  runtime: RuntimeType
): Promise<[RuntimeType, string] | null> {
  return coreGetRuntimeInfo(runtime);
}

/**
 * Cleanup sandbox resources
 */
export async function cleanupSandbox(): Promise<void> {
  return coreCleanupSandbox();
}

// ==================== Sessions ====================

/**
 * Start a new execution session
 */
export async function startSession(
  name: string,
  description?: string
): Promise<ExecutionSession> {
  return coreStartSession(name, description);
}

/**
 * Get current session ID
 */
export async function getCurrentSession(): Promise<string | null> {
  return coreGetCurrentSession();
}

/**
 * Set current session
 */
export async function setCurrentSession(sessionId: string | null): Promise<void> {
  return coreSetCurrentSession(sessionId);
}

/**
 * End current session
 */
export async function endSession(): Promise<void> {
  return coreEndSession();
}

/**
 * List all sessions
 */
export async function listSessions(
  activeOnly: boolean = false
): Promise<ExecutionSession[]> {
  return coreListSessions(activeOnly);
}

/**
 * Get session by ID
 */
export async function getSession(
  id: string
): Promise<ExecutionSession | null> {
  return coreGetSession(id);
}

/**
 * Delete a session
 */
export async function deleteSession(
  id: string,
  deleteExecutions: boolean = false
): Promise<void> {
  return coreDeleteSession(id, deleteExecutions);
}

/**
 * Update a session's name and description
 */
export async function updateSession(
  sessionId: string,
  name: string,
  description?: string
): Promise<void> {
  return coreUpdateSession(sessionId, name, description);
}

/**
 * Get all executions for a session
 */
export async function getSessionExecutions(
  sessionId: string
): Promise<SandboxExecutionRecord[]> {
  return coreGetSessionExecutions(sessionId);
}

// ==================== Execution History ====================

/**
 * Get execution by ID
 */
export async function getExecution(
  id: string
): Promise<SandboxExecutionRecord | null> {
  return invokeSandboxCommand<SandboxExecutionRecord | null>('sandbox_get_execution', { id });
}

/**
 * Query executions with filter
 */
export async function queryExecutions(
  filter: ExecutionFilter = {}
): Promise<SandboxExecutionRecord[]> {
  return invokeSandboxCommand<SandboxExecutionRecord[]>('sandbox_query_executions', { filter });
}

/**
 * Get recent executions
 */
export async function getRecentExecutions(
  limit: number = 50
): Promise<SandboxExecutionRecord[]> {
  return invokeSandboxCommand<SandboxExecutionRecord[]>('sandbox_get_recent_executions', { limit });
}

/**
 * Delete an execution
 */
export async function deleteExecution(id: string): Promise<boolean> {
  return invokeSandboxCommand<boolean>('sandbox_delete_execution', { id });
}

/**
 * Toggle execution favorite status
 */
export async function toggleExecutionFavorite(id: string): Promise<boolean> {
  return invokeSandboxCommand<boolean>('sandbox_toggle_favorite', { id });
}

/**
 * Add tags to an execution
 */
export async function addExecutionTags(
  id: string,
  tags: string[]
): Promise<void> {
  return invokeSandboxCommand<void>('sandbox_add_execution_tags', { id, tags });
}

/**
 * Remove tags from an execution
 */
export async function removeExecutionTags(
  id: string,
  tags: string[]
): Promise<void> {
  return invokeSandboxCommand<void>('sandbox_remove_execution_tags', { id, tags });
}

/**
 * Clear execution history
 * @param beforeDate ISO 8601 date string, clears executions before this date
 */
export async function clearExecutionHistory(
  beforeDate?: string
): Promise<number> {
  return invokeSandboxCommand<number>('sandbox_clear_history', {
    before_date: beforeDate,
  });
}

// ==================== Code Snippets ====================

/**
 * Create a new code snippet
 */
export async function createSnippet(
  request: CreateSnippetRequest
): Promise<CodeSnippet> {
  return invokeSandboxCommand<CodeSnippet>('sandbox_create_snippet', { request });
}

/**
 * Get snippet by ID
 */
export async function getSnippet(id: string): Promise<CodeSnippet | null> {
  return invokeSandboxCommand<CodeSnippet | null>('sandbox_get_snippet', { id });
}

/**
 * Query snippets with filter
 */
export async function querySnippets(
  filter: SnippetFilter = {}
): Promise<CodeSnippet[]> {
  return invokeSandboxCommand<CodeSnippet[]>('sandbox_query_snippets', { filter });
}

/**
 * Update a snippet
 */
export async function updateSnippet(snippet: CodeSnippet): Promise<void> {
  return invokeSandboxCommand<void>('sandbox_update_snippet', { snippet });
}

/**
 * Delete a snippet
 */
export async function deleteSnippet(id: string): Promise<boolean> {
  return invokeSandboxCommand<boolean>('sandbox_delete_snippet', { id });
}

/**
 * Create snippet from execution
 */
export async function createSnippetFromExecution(
  executionId: string,
  title: string,
  description?: string,
  category?: string,
  isTemplate: boolean = false
): Promise<CodeSnippet> {
  return invokeSandboxCommand<CodeSnippet>('sandbox_create_snippet_from_execution', {
    execution_id: executionId,
    title,
    description,
    category,
    is_template: isTemplate,
  });
}

/**
 * Execute a snippet
 */
export async function executeSnippet(id: string): Promise<SandboxExecutionResult> {
  return invokeSandboxCommand<SandboxExecutionResult>('sandbox_execute_snippet', { id });
}

// ==================== Statistics ====================

/**
 * Get language statistics
 */
export async function getLanguageStats(
  language: string
): Promise<LanguageStats | null> {
  return invokeSandboxCommand<LanguageStats | null>('sandbox_get_language_stats', {
    language,
  });
}

/**
 * Get all language statistics
 */
export async function getAllLanguageStats(): Promise<LanguageStats[]> {
  return invokeSandboxCommand<LanguageStats[]>('sandbox_get_all_language_stats');
}

/**
 * Get overall sandbox statistics
 */
export async function getSandboxStats(): Promise<SandboxStats> {
  return invokeSandboxCommand<SandboxStats>('sandbox_get_stats');
}

/**
 * Get daily execution counts
 */
export async function getDailyExecutionCounts(
  days: number = 30
): Promise<DailyExecutionCount[]> {
  const result = await invokeSandboxCommand<[string, number][]>('sandbox_get_daily_counts', {
    days,
  });
  return result.map(([date, count]) => ({ date, count }));
}

// ==================== Utilities ====================

/**
 * Export all sandbox data to JSON
 */
export async function exportSandboxData(): Promise<string> {
  return invokeSandboxCommand<string>('sandbox_export_data');
}

/**
 * Get all unique tags
 */
export async function getAllTags(): Promise<string[]> {
  return invokeSandboxCommand<string[]>('sandbox_get_all_tags');
}

/**
 * Get all unique categories
 */
export async function getAllCategories(): Promise<string[]> {
  return invokeSandboxCommand<string[]>('sandbox_get_all_categories');
}

/**
 * Get database size in bytes
 */
export async function getDatabaseSize(): Promise<number> {
  return invokeSandboxCommand<number>('sandbox_get_db_size');
}

/**
 * Vacuum database to reclaim space
 */
export async function vacuumDatabase(): Promise<void> {
  return invokeSandboxCommand<void>('sandbox_vacuum_db');
}

// ==================== Helper Functions ====================

/**
 * Format execution time for display
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format memory size for display
 */
export function formatMemorySize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Calculate success rate percentage
 */
export function calculateSuccessRate(stats: LanguageStats | SandboxStats): number {
  if (stats.total_executions === 0) return 0;
  return (stats.successful_executions / stats.total_executions) * 100;
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'timeout':
      return 'text-orange-500';
    case 'running':
      return 'text-blue-500';
    case 'pending':
      return 'text-gray-500';
    case 'cancelled':
      return 'text-gray-400';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get status icon
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    case 'timeout':
      return '⏱';
    case 'running':
      return '⟳';
    case 'pending':
      return '○';
    case 'cancelled':
      return '⊘';
    default:
      return '?';
  }
}

// Export all functions as a namespace for convenience
export const SandboxDbApi = {
  // Execution
  executeCode,
  executeCodeStreaming,
  cancelExecution,
  executeCodeWithOptions,
  quickExecute,
  executeWithStdin,
  executeWithLimits,
  // Configuration
  getSandboxStatus,
  getBackendSandboxConfig,
  updateBackendSandboxConfig,
  getAvailableRuntimes,
  getSupportedLanguages,
  checkRuntime,
  setPreferredRuntime,
  setDefaultTimeout,
  setDefaultMemoryLimit,
  setNetworkEnabled,
  toggleLanguage,
  prepareLanguage,
  getRuntimeInfo,
  cleanupSandbox,
  // Sessions
  startSession,
  getCurrentSession,
  setCurrentSession,
  endSession,
  listSessions,
  getSession,
  deleteSession,
  updateSession,
  getSessionExecutions,
  // History
  getExecution,
  queryExecutions,
  getRecentExecutions,
  deleteExecution,
  toggleExecutionFavorite,
  addExecutionTags,
  removeExecutionTags,
  clearExecutionHistory,
  // Snippets
  createSnippet,
  getSnippet,
  querySnippets,
  updateSnippet,
  deleteSnippet,
  createSnippetFromExecution,
  executeSnippet,
  // Statistics
  getLanguageStats,
  getAllLanguageStats,
  getSandboxStats,
  getDailyExecutionCounts,
  // Utilities
  exportSandboxData,
  getAllTags,
  getAllCategories,
  getDatabaseSize,
  vacuumDatabase,
  // Helpers
  formatExecutionTime,
  formatMemorySize,
  calculateSuccessRate,
  getStatusColor,
  getStatusIcon,
};

export default SandboxDbApi;
