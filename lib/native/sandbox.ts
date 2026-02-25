/**
 * Sandbox Service - Interface to Tauri backend sandbox
 *
 * Keeps backward-compatible exports while delegating to shared core helpers.
 */

import type {
  BackendSandboxConfig,
  ExecutionRequest,
  Language,
  RuntimeType,
  SandboxExecutionResult,
  SandboxStatus,
} from '@/types/system/sandbox';
import {
  cancelExecution,
  checkRuntime,
  cleanupSandbox,
  executeCode,
  executeCodeStreaming,
  executeCodeWithOptions,
  executeWithLimits,
  executeWithStdin,
  getAllLanguages,
  getAvailableLanguages,
  getAvailableRuntimes,
  getBackendSandboxConfig,
  getRuntimeInfo,
  getSandboxStatus,
  getSessionExecutions,
  getSupportedLanguages,
  invokeSandboxCommand,
  isSandboxAvailable,
  prepareLanguage,
  quickExecute,
  setDefaultMemoryLimit,
  setDefaultTimeout,
  setNetworkEnabled,
  setPreferredRuntime,
  toggleLanguage,
  updateBackendSandboxConfig,
  updateSession,
} from './sandbox-core';

export {
  cancelExecution,
  checkRuntime,
  executeCode,
  executeCodeStreaming,
  executeCodeWithOptions as executeWithOptions,
  executeWithLimits,
  executeWithStdin,
  getAllLanguages,
  getAvailableLanguages,
  getAvailableRuntimes,
  getBackendSandboxConfig,
  getRuntimeInfo,
  getSandboxStatus,
  getSessionExecutions,
  getSupportedLanguages,
  isSandboxAvailable,
  prepareLanguage,
  quickExecute,
  setDefaultTimeout,
  setNetworkEnabled,
  setPreferredRuntime,
  toggleLanguage,
  updateBackendSandboxConfig,
  updateSession,
};

export async function setMemoryLimit(memoryMb: number): Promise<void> {
  await setDefaultMemoryLimit(memoryMb);
}

export async function cleanupRuntimes(): Promise<void> {
  await cleanupSandbox();
}

export async function exportData(): Promise<string> {
  return invokeSandboxCommand<string>('sandbox_export_data');
}

export async function importData(jsonData: string): Promise<{ imported_snippets: number; skipped_snippets: number }> {
  const { importData: coreImportData } = await import('./sandbox-core');
  return coreImportData(jsonData);
}

export async function getDatabaseSize(): Promise<number> {
  return invokeSandboxCommand<number>('sandbox_get_db_size');
}

export async function vacuumDatabase(): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_vacuum_db');
}

/**
 * Backward compatible service object used by hooks/components.
 */
export const sandboxService = {
  execute: executeCode,
  quickExecute,
  executeWithStdin,
  executeWithLimits,
  executeWithOptions: executeCodeWithOptions,
  getStatus: getSandboxStatus,
  getConfig: getBackendSandboxConfig,
  updateConfig: updateBackendSandboxConfig,
  getRuntimes: getAvailableRuntimes,
  getLanguages: getSupportedLanguages,
  getAllLanguages,
  getAvailableLanguages,
  checkRuntime,
  getRuntimeInfo,
  prepareLanguage,
  toggleLanguage,
  setRuntime: setPreferredRuntime,
  setTimeout: setDefaultTimeout,
  setMemoryLimit,
  setNetworkEnabled,
  cancelExecution,
  executeStreaming: executeCodeStreaming,
  cleanup: cleanupRuntimes,
  isAvailable: isSandboxAvailable,
  exportData,
  importData,
  getDatabaseSize,
  vacuumDatabase,
};

export default sandboxService;

export type {
  BackendSandboxConfig,
  ExecutionRequest,
  Language,
  RuntimeType,
  SandboxExecutionResult,
  SandboxStatus,
};
