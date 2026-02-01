/**
 * System Scheduler Types
 *
 * Types for system-level task scheduling with support for
 * Windows Task Scheduler, macOS launchd, and Linux systemd.
 */

/** Unique identifier for system tasks */
export type SystemTaskId = string;

/** Run level for task execution */
export type RunLevel = 'user' | 'administrator';

/** Status of a system task */
export type SystemTaskStatus =
  | 'enabled'
  | 'disabled'
  | 'running'
  | 'completed'
  | 'failed'
  | 'unknown';

/** Risk level for task operations */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Type of operation requiring confirmation */
export type TaskOperation = 'create' | 'update' | 'delete' | 'enable' | 'run_now';

/** Cron-style trigger */
export interface CronTrigger {
  type: 'cron';
  expression: string;
  timezone?: string;
}

/** Interval-based trigger */
export interface IntervalTrigger {
  type: 'interval';
  seconds: number;
}

/** One-time trigger */
export interface OnceTrigger {
  type: 'once';
  run_at: string; // ISO 8601 datetime
}

/** Boot trigger */
export interface OnBootTrigger {
  type: 'on_boot';
  delay_seconds?: number;
}

/** Logon trigger */
export interface OnLogonTrigger {
  type: 'on_logon';
  user?: string;
}

/** Event trigger (Windows only) */
export interface OnEventTrigger {
  type: 'on_event';
  source: string;
  event_id: number;
}

/** Union of all trigger types */
export type SystemTaskTrigger =
  | CronTrigger
  | IntervalTrigger
  | OnceTrigger
  | OnBootTrigger
  | OnLogonTrigger
  | OnEventTrigger;

/** Script execution action */
export interface ExecuteScriptAction {
  type: 'execute_script';
  language: string;
  code: string;
  working_dir?: string;
  args?: string[];
  env?: Record<string, string>;
  timeout_secs?: number;
  memory_mb?: number;
  use_sandbox?: boolean;
}

/** Command execution action */
export interface RunCommandAction {
  type: 'run_command';
  command: string;
  args?: string[];
  working_dir?: string;
  env?: Record<string, string>;
}

/** Application launch action */
export interface LaunchAppAction {
  type: 'launch_app';
  path: string;
  args?: string[];
}

/** Union of all action types */
export type SystemTaskAction = ExecuteScriptAction | RunCommandAction | LaunchAppAction;

/** Result of a task execution */
export interface TaskRunResult {
  success: boolean;
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  duration_ms?: number;
}

/** System task definition */
export interface SystemTask {
  id: SystemTaskId;
  name: string;
  description?: string;
  trigger: SystemTaskTrigger;
  action: SystemTaskAction;
  run_level: RunLevel;
  status: SystemTaskStatus;
  requires_admin: boolean;
  tags: string[];
  created_at?: string;
  updated_at?: string;
  last_run_at?: string;
  next_run_at?: string;
  last_result?: TaskRunResult;
}

/** Input for creating a system task */
export interface CreateSystemTaskInput {
  name: string;
  description?: string;
  trigger: SystemTaskTrigger;
  action: SystemTaskAction;
  run_level?: RunLevel;
  tags?: string[];
}

/** Details shown in confirmation dialog */
export interface TaskConfirmationDetails {
  task_name: string;
  action_summary?: string;
  trigger_summary?: string;
  script_preview?: string;
}

/** Confirmation request for sensitive operations */
export interface TaskConfirmationRequest {
  task_id?: SystemTaskId;
  operation: TaskOperation;
  risk_level: RiskLevel;
  requires_admin: boolean;
  warnings: string[];
  details: TaskConfirmationDetails;
}

/** System scheduler capabilities */
export interface SchedulerCapabilities {
  os: string;
  backend: string;
  available: boolean;
  can_elevate: boolean;
  supported_triggers: string[];
  max_tasks: number;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  risk_level: RiskLevel;
  requires_admin: boolean;
}

/** Response type for operations that may require confirmation */
export type TaskOperationResponse =
  | { status: 'success'; task: SystemTask }
  | { status: 'confirmation_required'; confirmation: TaskConfirmationRequest }
  | { status: 'error'; message: string };

/** Check if response is success */
export function isTaskOperationSuccess(
  response: TaskOperationResponse
): response is { status: 'success'; task: SystemTask } {
  return response.status === 'success';
}

/** Check if response requires confirmation */
export function isConfirmationRequired(
  response: TaskOperationResponse
): response is { status: 'confirmation_required'; confirmation: TaskConfirmationRequest } {
  return response.status === 'confirmation_required';
}

/** Check if response is error */
export function isTaskOperationError(
  response: TaskOperationResponse
): response is { status: 'error'; message: string } {
  return response.status === 'error';
}

/** Default script execution settings */
export const DEFAULT_SCRIPT_SETTINGS = {
  timeout_secs: 300,
  memory_mb: 512,
  use_sandbox: true,
};

/** Supported script languages */
export const SCRIPT_LANGUAGES = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'javascript', label: 'JavaScript', icon: '📜' },
  { value: 'typescript', label: 'TypeScript', icon: '📘' },
  { value: 'bash', label: 'Bash', icon: '🐚' },
  { value: 'powershell', label: 'PowerShell', icon: '💠' },
  { value: 'ruby', label: 'Ruby', icon: '💎' },
  { value: 'go', label: 'Go', icon: '🔷' },
  { value: 'rust', label: 'Rust', icon: '⚙️' },
] as const;

/** Risk level display info */
export const RISK_LEVEL_INFO: Record<
  RiskLevel,
  { label: string; labelZh: string; color: string; icon: string }
> = {
  low: { label: 'Low Risk', labelZh: '低风险', color: 'text-green-500', icon: '✓' },
  medium: { label: 'Medium Risk', labelZh: '中等风险', color: 'text-yellow-500', icon: '⚠' },
  high: { label: 'High Risk', labelZh: '高风险', color: 'text-orange-500', icon: '⚠' },
  critical: { label: 'Critical Risk', labelZh: '危险', color: 'text-red-500', icon: '🛑' },
};
