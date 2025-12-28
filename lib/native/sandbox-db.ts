/**
 * Sandbox Database API - Native Tauri bindings for sandbox database operations
 *
 * This module provides TypeScript wrappers for the Rust sandbox database backend,
 * including execution history, code snippets, sessions, and statistics.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  CodeSnippet,
  CreateSnippetRequest,
  DailyExecutionCount,
  ExecutionFilter,
  ExecutionRecord,
  ExecutionRequest,
  ExecutionResult,
  ExecutionSession,
  Language,
  LanguageStats,
  RuntimeType,
  SandboxConfig,
  SandboxStats,
  SandboxStatus,
  SnippetFilter,
} from '@/types/sandbox';

// ==================== Execution ====================

/**
 * Execute code in the sandbox
 */
export async function executeCode(
  request: ExecutionRequest
): Promise<ExecutionResult> {
  return invoke<ExecutionResult>('sandbox_execute', { request });
}

/**
 * Execute code with custom options
 */
export async function executeCodeWithOptions(
  request: ExecutionRequest,
  tags: string[] = [],
  saveToHistory: boolean = true
): Promise<ExecutionResult> {
  return invoke<ExecutionResult>('sandbox_execute_with_options', {
    request,
    tags,
    saveToHistory,
  });
}

/**
 * Quick execute - simplified execution
 */
export async function quickExecute(
  language: string,
  code: string
): Promise<ExecutionResult> {
  return invoke<ExecutionResult>('sandbox_quick_execute', { language, code });
}

/**
 * Execute with stdin
 */
export async function executeWithStdin(
  language: string,
  code: string,
  stdin: string
): Promise<ExecutionResult> {
  return invoke<ExecutionResult>('sandbox_execute_with_stdin', {
    language,
    code,
    stdin,
  });
}

/**
 * Execute with specific limits
 */
export async function executeWithLimits(
  language: string,
  code: string,
  timeoutSecs: number,
  memoryMb: number
): Promise<ExecutionResult> {
  return invoke<ExecutionResult>('sandbox_execute_with_limits', {
    language,
    code,
    timeoutSecs,
    memoryMb,
  });
}

// ==================== Configuration ====================

/**
 * Get sandbox status
 */
export async function getSandboxStatus(): Promise<SandboxStatus> {
  return invoke<SandboxStatus>('sandbox_get_status');
}

/**
 * Get sandbox configuration
 */
export async function getSandboxConfig(): Promise<SandboxConfig> {
  return invoke<SandboxConfig>('sandbox_get_config');
}

/**
 * Update sandbox configuration
 */
export async function updateSandboxConfig(
  config: SandboxConfig
): Promise<void> {
  return invoke<void>('sandbox_update_config', { config });
}

/**
 * Get available runtimes
 */
export async function getAvailableRuntimes(): Promise<RuntimeType[]> {
  return invoke<RuntimeType[]>('sandbox_get_runtimes');
}

/**
 * Get supported languages
 */
export async function getSupportedLanguages(): Promise<Language[]> {
  return invoke<Language[]>('sandbox_get_languages');
}

/**
 * Check if a runtime is available
 */
export async function checkRuntime(runtime: RuntimeType): Promise<boolean> {
  return invoke<boolean>('sandbox_check_runtime', { runtime });
}

/**
 * Set preferred runtime
 */
export async function setPreferredRuntime(runtime: RuntimeType): Promise<void> {
  return invoke<void>('sandbox_set_runtime', { runtime });
}

/**
 * Set default timeout
 */
export async function setDefaultTimeout(timeoutSecs: number): Promise<void> {
  return invoke<void>('sandbox_set_timeout', { timeoutSecs });
}

/**
 * Set default memory limit
 */
export async function setDefaultMemoryLimit(memoryMb: number): Promise<void> {
  return invoke<void>('sandbox_set_memory_limit', { memoryMb });
}

/**
 * Set network access
 */
export async function setNetworkEnabled(enabled: boolean): Promise<void> {
  return invoke<void>('sandbox_set_network', { enabled });
}

/**
 * Toggle language enabled/disabled
 */
export async function toggleLanguage(
  language: string,
  enabled: boolean
): Promise<void> {
  return invoke<void>('sandbox_toggle_language', { language, enabled });
}

/**
 * Prepare/pull image for a language
 */
export async function prepareLanguage(language: string): Promise<void> {
  return invoke<void>('sandbox_prepare_language', { language });
}

/**
 * Get runtime info
 */
export async function getRuntimeInfo(
  runtime: RuntimeType
): Promise<[RuntimeType, string] | null> {
  return invoke<[RuntimeType, string] | null>('sandbox_get_runtime_info', {
    runtime,
  });
}

/**
 * Cleanup sandbox resources
 */
export async function cleanupSandbox(): Promise<void> {
  return invoke<void>('sandbox_cleanup');
}

// ==================== Sessions ====================

/**
 * Start a new execution session
 */
export async function startSession(
  name: string,
  description?: string
): Promise<ExecutionSession> {
  return invoke<ExecutionSession>('sandbox_start_session', {
    name,
    description,
  });
}

/**
 * Get current session ID
 */
export async function getCurrentSession(): Promise<string | null> {
  return invoke<string | null>('sandbox_get_current_session');
}

/**
 * Set current session
 */
export async function setCurrentSession(sessionId: string | null): Promise<void> {
  return invoke<void>('sandbox_set_current_session', { sessionId });
}

/**
 * End current session
 */
export async function endSession(): Promise<void> {
  return invoke<void>('sandbox_end_session');
}

/**
 * List all sessions
 */
export async function listSessions(
  activeOnly: boolean = false
): Promise<ExecutionSession[]> {
  return invoke<ExecutionSession[]>('sandbox_list_sessions', { activeOnly });
}

/**
 * Get session by ID
 */
export async function getSession(
  id: string
): Promise<ExecutionSession | null> {
  return invoke<ExecutionSession | null>('sandbox_get_session', { id });
}

/**
 * Delete a session
 */
export async function deleteSession(
  id: string,
  deleteExecutions: boolean = false
): Promise<void> {
  return invoke<void>('sandbox_delete_session', { id, deleteExecutions });
}

// ==================== Execution History ====================

/**
 * Get execution by ID
 */
export async function getExecution(
  id: string
): Promise<ExecutionRecord | null> {
  return invoke<ExecutionRecord | null>('sandbox_get_execution', { id });
}

/**
 * Query executions with filter
 */
export async function queryExecutions(
  filter: ExecutionFilter = {}
): Promise<ExecutionRecord[]> {
  return invoke<ExecutionRecord[]>('sandbox_query_executions', { filter });
}

/**
 * Get recent executions
 */
export async function getRecentExecutions(
  limit: number = 50
): Promise<ExecutionRecord[]> {
  return invoke<ExecutionRecord[]>('sandbox_get_recent_executions', { limit });
}

/**
 * Delete an execution
 */
export async function deleteExecution(id: string): Promise<boolean> {
  return invoke<boolean>('sandbox_delete_execution', { id });
}

/**
 * Toggle execution favorite status
 */
export async function toggleExecutionFavorite(id: string): Promise<boolean> {
  return invoke<boolean>('sandbox_toggle_favorite', { id });
}

/**
 * Add tags to an execution
 */
export async function addExecutionTags(
  id: string,
  tags: string[]
): Promise<void> {
  return invoke<void>('sandbox_add_execution_tags', { id, tags });
}

/**
 * Remove tags from an execution
 */
export async function removeExecutionTags(
  id: string,
  tags: string[]
): Promise<void> {
  return invoke<void>('sandbox_remove_execution_tags', { id, tags });
}

/**
 * Clear execution history
 * @param beforeDate ISO 8601 date string, clears executions before this date
 */
export async function clearExecutionHistory(
  beforeDate?: string
): Promise<number> {
  return invoke<number>('sandbox_clear_history', { beforeDate });
}

// ==================== Code Snippets ====================

/**
 * Create a new code snippet
 */
export async function createSnippet(
  request: CreateSnippetRequest
): Promise<CodeSnippet> {
  return invoke<CodeSnippet>('sandbox_create_snippet', { request });
}

/**
 * Get snippet by ID
 */
export async function getSnippet(id: string): Promise<CodeSnippet | null> {
  return invoke<CodeSnippet | null>('sandbox_get_snippet', { id });
}

/**
 * Query snippets with filter
 */
export async function querySnippets(
  filter: SnippetFilter = {}
): Promise<CodeSnippet[]> {
  return invoke<CodeSnippet[]>('sandbox_query_snippets', { filter });
}

/**
 * Update a snippet
 */
export async function updateSnippet(snippet: CodeSnippet): Promise<void> {
  return invoke<void>('sandbox_update_snippet', { snippet });
}

/**
 * Delete a snippet
 */
export async function deleteSnippet(id: string): Promise<boolean> {
  return invoke<boolean>('sandbox_delete_snippet', { id });
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
  return invoke<CodeSnippet>('sandbox_create_snippet_from_execution', {
    executionId,
    title,
    description,
    category,
    isTemplate,
  });
}

/**
 * Execute a snippet
 */
export async function executeSnippet(id: string): Promise<ExecutionResult> {
  return invoke<ExecutionResult>('sandbox_execute_snippet', { id });
}

// ==================== Statistics ====================

/**
 * Get language statistics
 */
export async function getLanguageStats(
  language: string
): Promise<LanguageStats | null> {
  return invoke<LanguageStats | null>('sandbox_get_language_stats', {
    language,
  });
}

/**
 * Get all language statistics
 */
export async function getAllLanguageStats(): Promise<LanguageStats[]> {
  return invoke<LanguageStats[]>('sandbox_get_all_language_stats');
}

/**
 * Get overall sandbox statistics
 */
export async function getSandboxStats(): Promise<SandboxStats> {
  return invoke<SandboxStats>('sandbox_get_stats');
}

/**
 * Get daily execution counts
 */
export async function getDailyExecutionCounts(
  days: number = 30
): Promise<DailyExecutionCount[]> {
  const result = await invoke<[string, number][]>('sandbox_get_daily_counts', {
    days,
  });
  return result.map(([date, count]) => ({ date, count }));
}

// ==================== Utilities ====================

/**
 * Export all sandbox data to JSON
 */
export async function exportSandboxData(): Promise<string> {
  return invoke<string>('sandbox_export_data');
}

/**
 * Get all unique tags
 */
export async function getAllTags(): Promise<string[]> {
  return invoke<string[]>('sandbox_get_all_tags');
}

/**
 * Get all unique categories
 */
export async function getAllCategories(): Promise<string[]> {
  return invoke<string[]>('sandbox_get_all_categories');
}

/**
 * Get database size in bytes
 */
export async function getDatabaseSize(): Promise<number> {
  return invoke<number>('sandbox_get_db_size');
}

/**
 * Vacuum database to reclaim space
 */
export async function vacuumDatabase(): Promise<void> {
  return invoke<void>('sandbox_vacuum_db');
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
  executeCodeWithOptions,
  quickExecute,
  executeWithStdin,
  executeWithLimits,
  // Configuration
  getSandboxStatus,
  getSandboxConfig,
  updateSandboxConfig,
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
