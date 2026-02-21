/**
 * System Scheduler Native API
 *
 * Provides access to system-level task scheduling via Tauri commands.
 * Supports Windows Task Scheduler, macOS launchd, and Linux systemd.
 */

import { invoke } from '@tauri-apps/api/core';

import { isTauri } from '@/lib/utils';
import type {
  CreateSystemTaskInput,
  SchedulerCapabilities,
  SystemTask,
  SystemTaskId,
  TaskConfirmationRequest,
  TaskOperationResponse,
  TaskRunResult,
  ValidationResult,
} from '@/types/scheduler';

/**
 * Get scheduler capabilities for the current platform
 */
export async function getSchedulerCapabilities(): Promise<SchedulerCapabilities> {
  if (!isTauri()) {
    return {
      os: 'browser',
      backend: 'none',
      available: false,
      can_elevate: false,
      supported_triggers: [],
      max_tasks: 0,
    };
  }

  return invoke<SchedulerCapabilities>('scheduler_get_capabilities');
}

/**
 * Check if the system scheduler is available
 */
export async function isSchedulerAvailable(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  return invoke<boolean>('scheduler_is_available');
}

/**
 * Check if running with elevated privileges
 */
export async function isSchedulerElevated(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  return invoke<boolean>('scheduler_is_elevated');
}

/**
 * Create a new system task
 *
 * @param input Task configuration
 * @param confirmed Whether user has confirmed the operation (for high-risk tasks)
 * @returns Task operation response (success, confirmation required, or error)
 */
export async function createSystemTask(
  input: CreateSystemTaskInput,
  confirmed = false
): Promise<TaskOperationResponse> {
  if (!isTauri()) {
    return {
      status: 'error',
      message: 'System scheduler requires Tauri environment',
    };
  }

  return invoke<TaskOperationResponse>('scheduler_create_task', {
    input,
    confirmed,
  });
}

/**
 * Update an existing system task
 *
 * @param taskId Task identifier
 * @param input New task configuration
 * @param confirmed Whether user has confirmed the operation
 */
export async function updateSystemTask(
  taskId: SystemTaskId,
  input: CreateSystemTaskInput,
  confirmed = false
): Promise<TaskOperationResponse> {
  if (!isTauri()) {
    return {
      status: 'error',
      message: 'System scheduler requires Tauri environment',
    };
  }

  return invoke<TaskOperationResponse>('scheduler_update_task', {
    taskId,
    input,
    confirmed,
  });
}

/**
 * Delete a system task
 */
export async function deleteSystemTask(taskId: SystemTaskId): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('System scheduler requires Tauri environment');
  }

  return invoke<boolean>('scheduler_delete_task', { taskId });
}

/**
 * Get a system task by ID
 */
export async function getSystemTask(taskId: SystemTaskId): Promise<SystemTask | null> {
  if (!isTauri()) {
    return null;
  }

  return invoke<SystemTask | null>('scheduler_get_task', { taskId });
}

/**
 * List all Cognia-managed system tasks
 */
export async function listSystemTasks(): Promise<SystemTask[]> {
  if (!isTauri()) {
    return [];
  }

  return invoke<SystemTask[]>('scheduler_list_tasks');
}

/**
 * Enable a system task
 */
export async function enableSystemTask(taskId: SystemTaskId): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('System scheduler requires Tauri environment');
  }

  return invoke<boolean>('scheduler_enable_task', { taskId });
}

/**
 * Disable a system task
 */
export async function disableSystemTask(taskId: SystemTaskId): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('System scheduler requires Tauri environment');
  }

  return invoke<boolean>('scheduler_disable_task', { taskId });
}

/**
 * Run a system task immediately
 */
export async function runSystemTaskNow(taskId: SystemTaskId): Promise<TaskRunResult> {
  if (!isTauri()) {
    throw new Error('System scheduler requires Tauri environment');
  }

  return invoke<TaskRunResult>('scheduler_run_task_now', { taskId });
}

/**
 * Confirm a pending task operation
 */
export async function confirmSystemTask(confirmationId: SystemTaskId): Promise<SystemTask | null> {
  if (!isTauri()) {
    return null;
  }

  return invoke<SystemTask | null>('scheduler_confirm_task', { confirmationId });
}

/**
 * Cancel a pending confirmation
 */
export async function cancelTaskConfirmation(confirmationId: SystemTaskId): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  return invoke<boolean>('scheduler_cancel_confirmation', { confirmationId });
}

/**
 * Get all pending confirmations
 */
export async function getPendingConfirmations(): Promise<TaskConfirmationRequest[]> {
  if (!isTauri()) {
    return [];
  }

  return invoke<TaskConfirmationRequest[]>('scheduler_get_pending_confirmations');
}

/**
 * Request admin elevation
 */
export async function requestSchedulerElevation(): Promise<boolean> {
  if (!isTauri()) {
    throw new Error('System scheduler requires Tauri environment');
  }

  return invoke<boolean>('scheduler_request_elevation');
}

/**
 * Validate a system task input without creating it
 */
export async function validateSystemTask(
  input: CreateSystemTaskInput
): Promise<ValidationResult> {
  if (!isTauri()) {
    return {
      valid: false,
      errors: ['System scheduler requires Tauri environment'],
      warnings: [],
      risk_level: 'low',
      requires_admin: false,
    };
  }

  return invoke<ValidationResult>('scheduler_validate_task', { input });
}

/**
 * Helper to create a cron trigger
 */
export function createCronTrigger(expression: string, timezone?: string) {
  return {
    type: 'cron' as const,
    expression,
    timezone,
  };
}

/**
 * Helper to create an interval trigger
 */
export function createIntervalTrigger(seconds: number) {
  return {
    type: 'interval' as const,
    seconds,
  };
}

/**
 * Helper to create a one-time trigger
 */
export function createOnceTrigger(runAt: Date | string) {
  return {
    type: 'once' as const,
    run_at: typeof runAt === 'string' ? runAt : runAt.toISOString(),
  };
}

/**
 * Helper to create a boot trigger
 */
export function createBootTrigger(delaySeconds = 0) {
  return {
    type: 'on_boot' as const,
    delay_seconds: delaySeconds,
  };
}

/**
 * Helper to create a logon trigger
 */
export function createLogonTrigger(user?: string) {
  return {
    type: 'on_logon' as const,
    user,
  };
}

/**
 * Helper to create a script execution action
 */
export function createScriptAction(
  language: string,
  code: string,
  options?: {
    working_dir?: string;
    args?: string[];
    env?: Record<string, string>;
    timeout_secs?: number;
    memory_mb?: number;
    use_sandbox?: boolean;
  }
) {
  return {
    type: 'execute_script' as const,
    language,
    code,
    working_dir: options?.working_dir,
    args: options?.args || [],
    env: options?.env || {},
    timeout_secs: options?.timeout_secs ?? 300,
    memory_mb: options?.memory_mb ?? 512,
    use_sandbox: options?.use_sandbox ?? true,
  };
}

/**
 * Helper to create a command action
 */
export function createCommandAction(
  command: string,
  options?: {
    args?: string[];
    working_dir?: string;
    env?: Record<string, string>;
  }
) {
  return {
    type: 'run_command' as const,
    command,
    args: options?.args || [],
    working_dir: options?.working_dir,
    env: options?.env || {},
  };
}

/**
 * Helper to create an app launch action
 */
export function createAppAction(path: string, args?: string[]) {
  return {
    type: 'launch_app' as const,
    path,
    args: args || [],
  };
}
