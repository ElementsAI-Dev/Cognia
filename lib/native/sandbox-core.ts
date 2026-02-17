import { invoke } from '@tauri-apps/api/core';
import type {
  BackendSandboxConfig,
  ExecutionRequest,
  ExecutionSession,
  Language,
  RuntimeType,
  SandboxExecutionRecord,
  SandboxExecutionResult,
  SandboxStatus,
} from '@/types/system/sandbox';

export function isTauriSandboxEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function assertTauriSandboxEnvironment(): void {
  if (!isTauriSandboxEnvironment()) {
    throw new Error('Sandbox requires Tauri environment');
  }
}

function normalizeSandboxError(command: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`[sandbox:${command}] ${message}`);
}

export async function invokeSandboxCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  assertTauriSandboxEnvironment();
  try {
    if (args) {
      return await invoke<T>(command, args);
    }
    return await invoke<T>(command);
  } catch (error) {
    throw normalizeSandboxError(command, error);
  }
}

export async function executeCode(
  request: ExecutionRequest
): Promise<SandboxExecutionResult> {
  return invokeSandboxCommand<SandboxExecutionResult>('sandbox_execute', { request });
}

export async function executeCodeWithOptions(
  request: ExecutionRequest,
  tags: string[] = [],
  saveToHistory: boolean = true
): Promise<SandboxExecutionResult> {
  return invokeSandboxCommand<SandboxExecutionResult>('sandbox_execute_with_options', {
    request,
    tags,
    save_to_history: saveToHistory,
  });
}

export async function quickExecute(
  language: string,
  code: string
): Promise<SandboxExecutionResult> {
  return invokeSandboxCommand<SandboxExecutionResult>('sandbox_quick_execute', {
    language,
    code,
  });
}

export async function executeWithStdin(
  language: string,
  code: string,
  stdin: string
): Promise<SandboxExecutionResult> {
  return invokeSandboxCommand<SandboxExecutionResult>('sandbox_execute_with_stdin', {
    language,
    code,
    stdin,
  });
}

export async function executeWithLimits(
  language: string,
  code: string,
  timeoutSecs: number,
  memoryMb: number
): Promise<SandboxExecutionResult> {
  return invokeSandboxCommand<SandboxExecutionResult>('sandbox_execute_with_limits', {
    language,
    code,
    timeout_secs: timeoutSecs,
    memory_mb: memoryMb,
  });
}

export async function getSandboxStatus(): Promise<SandboxStatus> {
  return invokeSandboxCommand<SandboxStatus>('sandbox_get_status');
}

export async function getBackendSandboxConfig(): Promise<BackendSandboxConfig> {
  return invokeSandboxCommand<BackendSandboxConfig>('sandbox_get_config');
}

export async function updateBackendSandboxConfig(
  config: BackendSandboxConfig
): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_update_config', { config });
}

export async function getAvailableRuntimes(): Promise<RuntimeType[]> {
  return invokeSandboxCommand<RuntimeType[]>('sandbox_get_runtimes');
}

export async function getSupportedLanguages(): Promise<Language[]> {
  return invokeSandboxCommand<Language[]>('sandbox_get_languages');
}

export async function getAllLanguages(): Promise<Language[]> {
  return invokeSandboxCommand<Language[]>('sandbox_get_all_languages');
}

export async function getAvailableLanguages(): Promise<string[]> {
  return invokeSandboxCommand<string[]>('sandbox_get_available_languages');
}

export async function checkRuntime(runtime: RuntimeType): Promise<boolean> {
  return invokeSandboxCommand<boolean>('sandbox_check_runtime', { runtime });
}

export async function prepareLanguage(language: string): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_prepare_language', { language });
}

export async function toggleLanguage(
  language: string,
  enabled: boolean
): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_toggle_language', { language, enabled });
}

export async function setPreferredRuntime(runtime: RuntimeType): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_set_runtime', { runtime });
}

export async function setDefaultTimeout(timeoutSecs: number): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_set_timeout', { timeout_secs: timeoutSecs });
}

export async function setDefaultMemoryLimit(memoryMb: number): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_set_memory_limit', { memory_mb: memoryMb });
}

export async function setNetworkEnabled(enabled: boolean): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_set_network', { enabled });
}

export async function getRuntimeInfo(
  runtime: RuntimeType
): Promise<[RuntimeType, string] | null> {
  return invokeSandboxCommand<[RuntimeType, string] | null>('sandbox_get_runtime_info', {
    runtime,
  });
}

export async function cleanupSandbox(): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_cleanup');
}

export async function startSession(
  name: string,
  description?: string
): Promise<ExecutionSession> {
  return invokeSandboxCommand<ExecutionSession>('sandbox_start_session', {
    name,
    description,
  });
}

export async function getCurrentSession(): Promise<string | null> {
  return invokeSandboxCommand<string | null>('sandbox_get_current_session');
}

export async function setCurrentSession(sessionId: string | null): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_set_current_session', {
    session_id: sessionId,
  });
}

export async function endSession(): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_end_session');
}

export async function listSessions(
  activeOnly: boolean = false
): Promise<ExecutionSession[]> {
  return invokeSandboxCommand<ExecutionSession[]>('sandbox_list_sessions', {
    active_only: activeOnly,
  });
}

export async function getSession(
  id: string
): Promise<ExecutionSession | null> {
  return invokeSandboxCommand<ExecutionSession | null>('sandbox_get_session', { id });
}

export async function deleteSession(
  id: string,
  deleteExecutions: boolean = false
): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_delete_session', {
    id,
    delete_executions: deleteExecutions,
  });
}

export async function updateSession(
  sessionId: string,
  name: string,
  description?: string
): Promise<void> {
  await invokeSandboxCommand<void>('sandbox_update_session', {
    session_id: sessionId,
    name,
    description,
  });
}

export async function getSessionExecutions(
  sessionId: string
): Promise<SandboxExecutionRecord[]> {
  return invokeSandboxCommand<SandboxExecutionRecord[]>(
    'sandbox_get_session_executions',
    { session_id: sessionId }
  );
}

export async function isSandboxAvailable(): Promise<boolean> {
  if (!isTauriSandboxEnvironment()) {
    return false;
  }
  try {
    const runtimes = await getAvailableRuntimes();
    return runtimes.length > 0;
  } catch {
    return false;
  }
}
