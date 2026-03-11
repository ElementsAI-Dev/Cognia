import type {
  BackendSandboxConfig,
  ExecutionRequest,
  ExecutionStatus,
  LegacyExecutionStatus,
  SandboxExecutionDiagnostics,
  SandboxExecutionRecord,
  SandboxExecutionResult,
  SandboxLifecycleStatus,
  SandboxPolicyProfile,
  SandboxPreflightRequest,
} from '@/types/system/sandbox';
import { DEFAULT_SANDBOX_CONFIG } from '@/types/system/sandbox';

const LEGACY_TO_LIFECYCLE: Record<LegacyExecutionStatus, SandboxLifecycleStatus> = {
  pending: 'queued',
  running: 'running',
  completed: 'success',
  failed: 'error',
  timeout: 'timeout',
  cancelled: 'cancelled',
};

const LIFECYCLE_TO_LEGACY: Record<SandboxLifecycleStatus, LegacyExecutionStatus> = {
  queued: 'pending',
  running: 'running',
  success: 'completed',
  error: 'failed',
  timeout: 'timeout',
  cancelled: 'cancelled',
};

export interface SandboxPolicyValidationIssue {
  field: 'timeout_secs' | 'memory_limit_mb' | 'network_enabled' | 'runtime';
  code: string;
  message: string;
}

export function normalizeLifecycleStatus(
  status: ExecutionStatus | undefined,
  fallback: SandboxLifecycleStatus = 'queued'
): SandboxLifecycleStatus {
  if (!status) return fallback;
  if (status in LIFECYCLE_TO_LEGACY) {
    return status as SandboxLifecycleStatus;
  }
  if (status in LEGACY_TO_LIFECYCLE) {
    return LEGACY_TO_LIFECYCLE[status as LegacyExecutionStatus];
  }
  return fallback;
}

export function toLegacyExecutionStatus(
  lifecycleStatus: SandboxLifecycleStatus
): LegacyExecutionStatus {
  return LIFECYCLE_TO_LEGACY[lifecycleStatus];
}

export function normalizeDiagnostics(
  diagnostics: SandboxExecutionDiagnostics | null | undefined,
  fallbackError?: string | null
): SandboxExecutionDiagnostics | null {
  if (diagnostics) {
    return diagnostics;
  }
  if (!fallbackError) {
    return null;
  }
  return {
    category: 'internal_failure',
    code: 'legacy_error',
    message: fallbackError,
  };
}

export function normalizeExecutionResult(
  result: SandboxExecutionResult
): SandboxExecutionResult {
  const lifecycleStatus = normalizeLifecycleStatus(result.lifecycle_status ?? result.status);
  return {
    ...result,
    lifecycle_status: lifecycleStatus,
    diagnostics: normalizeDiagnostics(result.diagnostics, result.error),
  };
}

export function normalizeExecutionRecord(
  record: SandboxExecutionRecord
): SandboxExecutionRecord {
  const lifecycleStatus = normalizeLifecycleStatus(record.lifecycle_status ?? record.status);
  return {
    ...record,
    lifecycle_status: lifecycleStatus,
    diagnostics: normalizeDiagnostics(record.diagnostics, record.error),
  };
}

export function getSandboxPolicyProfiles(
  config?: Pick<BackendSandboxConfig, 'policy_profiles'>
): Record<string, SandboxPolicyProfile> {
  return {
    ...(DEFAULT_SANDBOX_CONFIG.policy_profiles ?? {}),
    ...(config?.policy_profiles ?? {}),
  };
}

export function resolveSandboxPolicyProfile(
  config?: Pick<BackendSandboxConfig, 'policy_profiles' | 'active_policy_profile'>,
  requestedProfile?: string
): SandboxPolicyProfile {
  const profiles = getSandboxPolicyProfiles(config);
  const activeProfile =
    requestedProfile ??
    config?.active_policy_profile ??
    DEFAULT_SANDBOX_CONFIG.active_policy_profile ??
    'balanced';

  return profiles[activeProfile] ?? profiles.balanced ?? Object.values(profiles)[0];
}

export function validateExecutionPolicyBounds(
  request: Pick<
    ExecutionRequest,
    'timeout_secs' | 'memory_limit_mb' | 'network_enabled' | 'runtime'
  >,
  profile: SandboxPolicyProfile,
  globalNetworkEnabled: boolean
): SandboxPolicyValidationIssue[] {
  const issues: SandboxPolicyValidationIssue[] = [];

  if (request.timeout_secs !== undefined && request.timeout_secs <= 0) {
    issues.push({
      field: 'timeout_secs',
      code: 'invalid_timeout',
      message: 'Timeout must be greater than 0 seconds.',
    });
  } else if (
    request.timeout_secs !== undefined &&
    request.timeout_secs > profile.max_timeout_secs
  ) {
    issues.push({
      field: 'timeout_secs',
      code: 'timeout_out_of_bounds',
      message: `Timeout exceeds profile limit (${profile.max_timeout_secs}s).`,
    });
  }

  if (request.memory_limit_mb !== undefined && request.memory_limit_mb <= 0) {
    issues.push({
      field: 'memory_limit_mb',
      code: 'invalid_memory',
      message: 'Memory limit must be greater than 0 MB.',
    });
  } else if (
    request.memory_limit_mb !== undefined &&
    request.memory_limit_mb > profile.max_memory_limit_mb
  ) {
    issues.push({
      field: 'memory_limit_mb',
      code: 'memory_out_of_bounds',
      message: `Memory exceeds profile limit (${profile.max_memory_limit_mb} MB).`,
    });
  }

  if (request.network_enabled && (!profile.allow_network || !globalNetworkEnabled)) {
    issues.push({
      field: 'network_enabled',
      code: 'network_not_allowed',
      message: 'Network access is not allowed by policy.',
    });
  }

  if (request.runtime && !profile.allowed_runtimes.includes(request.runtime)) {
    issues.push({
      field: 'runtime',
      code: 'runtime_not_allowed',
      message: `Runtime '${request.runtime}' is not allowed by profile '${profile.id}'.`,
    });
  }

  return issues;
}

export function normalizePreflightRequest(
  request: SandboxPreflightRequest
): SandboxPreflightRequest {
  return {
    ...request,
    language: request.language.trim(),
  };
}
