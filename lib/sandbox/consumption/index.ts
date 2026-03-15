import {
  executeCode,
  getSandboxStatus,
  isSandboxAvailable,
  quickExecute,
  sandboxPreflight,
} from '@/lib/native/sandbox';
import {
  normalizeExecutionResult,
  normalizePreflightRequest,
  resolveSandboxPolicyProfile,
  validateExecutionPolicyBounds,
  type SandboxPolicyValidationIssue,
} from '@/lib/sandbox/compat';
import { isTauri } from '@/lib/utils';
import type {
  ExecutionRequest,
  SandboxConsumptionMetadata,
  SandboxDiagnosticsCategory,
  SandboxEntrypointPolicy,
  SandboxExecutionDiagnostics,
  SandboxExecutionResult,
  SandboxPreflightReasonCode,
  SandboxPreflightRequest,
  SandboxPreflightResult,
  SandboxStatus,
} from '@/types/system/sandbox';

export const SANDBOX_ENTRYPOINT_POLICIES = {
  chatCodeBlock: {
    entrypoint: 'chat-code-block',
    mode: 'interactive',
    requires_preflight: false,
    allow_quick_run: true,
    degraded_behavior: 'disable',
    allowed_overrides: {},
  },
  aiCodeBlock: {
    entrypoint: 'ai-code-block',
    mode: 'interactive',
    requires_preflight: false,
    allow_quick_run: true,
    degraded_behavior: 'disable',
    allowed_overrides: {},
  },
  workflowCodeStep: {
    entrypoint: 'workflow-code-step',
    mode: 'background',
    requires_preflight: true,
    allow_quick_run: false,
    degraded_behavior: 'blocked-result',
    allowed_overrides: {
      timeout_secs: true,
      memory_limit_mb: true,
      network_enabled: true,
      runtime: true,
      env: true,
      args: true,
      files: true,
      stdin: true,
      policy_profile: true,
    },
  },
  schedulerScript: {
    entrypoint: 'scheduler-script',
    mode: 'background',
    requires_preflight: true,
    allow_quick_run: false,
    degraded_behavior: 'blocked-result',
    sandbox_optional: true,
    allowed_overrides: {
      timeout_secs: true,
      memory_limit_mb: true,
      env: true,
      args: true,
    },
  },
} satisfies Record<string, SandboxEntrypointPolicy>;

export interface SandboxConsumptionDependencies {
  isDesktopRuntime: () => boolean;
  isSandboxAvailable: () => Promise<boolean>;
  getSandboxStatus: () => Promise<SandboxStatus>;
  preflight: (request: SandboxPreflightRequest) => Promise<SandboxPreflightResult>;
  execute: (request: ExecutionRequest) => Promise<SandboxExecutionResult>;
  quickExecute: (language: string, code: string) => Promise<SandboxExecutionResult>;
}

export interface SandboxEntrypointAvailability {
  canExecute: boolean;
  shouldRenderExecuteButton: boolean;
  blockedReason: string | null;
  blockedResult: SandboxExecutionResult | null;
}

export interface SandboxEntrypointExecutionArgs {
  policy: SandboxEntrypointPolicy;
  request: ExecutionRequest;
  bypassSandbox?: boolean;
}

export interface SandboxEntrypointExecutionOutcome {
  kind: 'executed' | 'blocked' | 'bypassed';
  metadata: SandboxConsumptionMetadata;
  result: SandboxExecutionResult | null;
}

const DEFAULT_DEPENDENCIES: SandboxConsumptionDependencies = {
  isDesktopRuntime: isTauri,
  isSandboxAvailable,
  getSandboxStatus,
  preflight: sandboxPreflight,
  execute: executeCode,
  quickExecute,
};

const REQUEST_OVERRIDE_FIELDS: Array<keyof NonNullable<SandboxEntrypointPolicy['allowed_overrides']>> = [
  'timeout_secs',
  'memory_limit_mb',
  'network_enabled',
  'runtime',
  'env',
  'args',
  'files',
  'stdin',
  'policy_profile',
];

function createConsumptionMetadata(
  policy: SandboxEntrypointPolicy,
  overrides: Partial<SandboxConsumptionMetadata> = {}
): SandboxConsumptionMetadata {
  return {
    entrypoint: policy.entrypoint,
    mode: policy.mode,
    degraded_behavior: policy.degraded_behavior,
    requires_preflight: policy.requires_preflight,
    sandbox_enabled: true,
    blocked: false,
    bypassed: false,
    used_quick_run: false,
    policy_profile: null,
    ...overrides,
  };
}

function attachConsumptionMetadata(
  result: SandboxExecutionResult,
  policy: SandboxEntrypointPolicy,
  overrides: Partial<SandboxConsumptionMetadata> = {}
): SandboxExecutionResult {
  return normalizeExecutionResult({
    ...result,
    consumption_metadata: createConsumptionMetadata(policy, overrides),
  });
}

function mapPreflightReasonToCategory(
  reasonCode: SandboxPreflightReasonCode
): SandboxDiagnosticsCategory {
  switch (reasonCode) {
    case 'runtime_not_allowed':
    case 'network_not_allowed':
      return 'security_policy';
    case 'timeout_out_of_bounds':
    case 'memory_out_of_bounds':
    case 'invalid_timeout':
    case 'invalid_memory':
      return 'validation';
    case 'runtime_unavailable':
    case 'language_disabled':
    case 'language_unavailable':
    case 'unsupported_language':
      return 'runtime_unavailable';
    default:
      return 'internal_failure';
  }
}

function createDiagnosticsFromIssue(
  issue: SandboxPolicyValidationIssue
): SandboxExecutionDiagnostics {
  return {
    category:
      issue.field === 'network_enabled' || issue.field === 'runtime'
        ? 'security_policy'
        : 'validation',
    code: issue.code,
    message: issue.message,
  };
}

function createBlockedResult(args: {
  policy: SandboxEntrypointPolicy;
  request: Pick<ExecutionRequest, 'language' | 'runtime' | 'policy_profile'>;
  diagnostics: SandboxExecutionDiagnostics;
  usedQuickRun?: boolean;
}): SandboxExecutionResult {
  return normalizeExecutionResult({
    id: `blocked:${args.policy.entrypoint}:${args.diagnostics.code}`,
    status: 'failed',
    stdout: '',
    stderr: '',
    exit_code: null,
    execution_time_ms: 0,
    memory_used_bytes: null,
    error: args.diagnostics.message || args.diagnostics.code,
    runtime: args.request.runtime ?? 'native',
    language: args.request.language,
    diagnostics: args.diagnostics,
    consumption_metadata: createConsumptionMetadata(args.policy, {
      sandbox_enabled: false,
      blocked: true,
      bypassed: false,
      used_quick_run: Boolean(args.usedQuickRun),
      policy_profile: args.request.policy_profile ?? null,
    }),
  });
}

function getDisallowedOverrideDiagnostics(
  policy: SandboxEntrypointPolicy,
  request: ExecutionRequest
): SandboxExecutionDiagnostics | null {
  for (const field of REQUEST_OVERRIDE_FIELDS) {
    const value = request[field];
    if (value !== undefined && !policy.allowed_overrides[field]) {
      return {
        category: 'validation',
        code: 'override_not_allowed',
        message: `Override '${field}' is not allowed for entrypoint '${policy.entrypoint}'.`,
      };
    }
  }
  return null;
}

function sanitizeRequestForPolicy(
  policy: SandboxEntrypointPolicy,
  request: ExecutionRequest
): ExecutionRequest {
  const sanitized: ExecutionRequest = {
    language: request.language,
    code: request.code,
  };

  for (const field of REQUEST_OVERRIDE_FIELDS) {
    if (policy.allowed_overrides[field] && request[field] !== undefined) {
      sanitized[field] = request[field] as never;
    }
  }

  return sanitized;
}

function canUseQuickRun(policy: SandboxEntrypointPolicy, request: ExecutionRequest): boolean {
  return (
    policy.allow_quick_run &&
    request.stdin === undefined &&
    request.args === undefined &&
    request.env === undefined &&
    request.timeout_secs === undefined &&
    request.memory_limit_mb === undefined &&
    request.runtime === undefined &&
    request.files === undefined &&
    request.network_enabled === undefined &&
    request.policy_profile === undefined
  );
}

export function resolveSandboxEntrypointAvailability(args: {
  policy: SandboxEntrypointPolicy;
  language: string;
  sandboxAvailable: boolean;
  isLanguageSupported: boolean;
}): SandboxEntrypointAvailability {
  const shouldRenderExecuteButton = Boolean(args.language) && args.isLanguageSupported;
  if (!shouldRenderExecuteButton) {
    return {
      canExecute: false,
      shouldRenderExecuteButton: false,
      blockedReason: null,
      blockedResult: null,
    };
  }

  if (args.sandboxAvailable) {
    return {
      canExecute: true,
      shouldRenderExecuteButton: true,
      blockedReason: null,
      blockedResult: null,
    };
  }

  const blockedResult = createBlockedResult({
    policy: args.policy,
    request: {
      language: args.language,
      policy_profile: undefined,
    },
    diagnostics: {
      category: 'runtime_unavailable',
      code: 'desktop_runtime_required',
      message: 'Code execution requires the desktop sandbox runtime.',
      remediation_hint: 'Open the desktop app to run this code.',
    },
    usedQuickRun: args.policy.allow_quick_run,
  });

  return {
    canExecute: false,
    shouldRenderExecuteButton: true,
    blockedReason: blockedResult.diagnostics?.message || blockedResult.error,
    blockedResult,
  };
}

export async function executeSandboxEntrypoint(
  args: SandboxEntrypointExecutionArgs,
  dependencies: SandboxConsumptionDependencies = DEFAULT_DEPENDENCIES
): Promise<SandboxEntrypointExecutionOutcome> {
  const { policy, request, bypassSandbox = false } = args;

  if (bypassSandbox) {
    return {
      kind: 'bypassed',
      result: null,
      metadata: createConsumptionMetadata(policy, {
        sandbox_enabled: false,
        blocked: false,
        bypassed: true,
        used_quick_run: false,
        policy_profile: request.policy_profile ?? null,
      }),
    };
  }

  if (!dependencies.isDesktopRuntime()) {
    const result = createBlockedResult({
      policy,
      request,
      diagnostics: {
        category: 'runtime_unavailable',
        code: 'desktop_runtime_required',
        message: 'Code execution requires the desktop sandbox runtime.',
        remediation_hint: 'Open the desktop app to run this code.',
      },
      usedQuickRun: canUseQuickRun(policy, request),
    });
    return {
      kind: 'blocked',
      metadata: result.consumption_metadata || createConsumptionMetadata(policy),
      result,
    };
  }

  const sandboxAvailable = await dependencies.isSandboxAvailable();
  if (!sandboxAvailable) {
    const result = createBlockedResult({
      policy,
      request,
      diagnostics: {
        category: 'runtime_unavailable',
        code: 'sandbox_unavailable',
        message: 'Sandbox execution is unavailable in the current environment.',
        remediation_hint: 'Enable the desktop sandbox runtime and try again.',
      },
      usedQuickRun: canUseQuickRun(policy, request),
    });
    return {
      kind: 'blocked',
      metadata: result.consumption_metadata || createConsumptionMetadata(policy),
      result,
    };
  }

  const disallowedOverride = getDisallowedOverrideDiagnostics(policy, request);
  if (disallowedOverride) {
    const result = createBlockedResult({
      policy,
      request,
      diagnostics: disallowedOverride,
      usedQuickRun: canUseQuickRun(policy, request),
    });
    return {
      kind: 'blocked',
      metadata: result.consumption_metadata || createConsumptionMetadata(policy),
      result,
    };
  }

  const sanitizedRequest = sanitizeRequestForPolicy(policy, request);
  const status = await dependencies.getSandboxStatus();
  const profile = resolveSandboxPolicyProfile(status.config, sanitizedRequest.policy_profile);
  const validationIssues = validateExecutionPolicyBounds(
    sanitizedRequest,
    profile,
    status.config.network_enabled
  );

  if (validationIssues.length > 0) {
    const diagnostics = createDiagnosticsFromIssue(validationIssues[0]);
    const result = createBlockedResult({
      policy,
      request: {
        ...sanitizedRequest,
        policy_profile: profile.id,
      },
      diagnostics,
      usedQuickRun: canUseQuickRun(policy, sanitizedRequest),
    });
    return {
      kind: 'blocked',
      metadata: result.consumption_metadata || createConsumptionMetadata(policy),
      result,
    };
  }

  if (policy.requires_preflight) {
    const preflightRequest = normalizePreflightRequest({
      language: sanitizedRequest.language,
      runtime: sanitizedRequest.runtime,
      timeout_secs: sanitizedRequest.timeout_secs,
      memory_limit_mb: sanitizedRequest.memory_limit_mb,
      network_enabled: sanitizedRequest.network_enabled,
      policy_profile: sanitizedRequest.policy_profile ?? profile.id,
    });
    const preflight = await dependencies.preflight(preflightRequest);

    if (preflight.status === 'blocked') {
      const result = createBlockedResult({
        policy,
        request: {
          language: sanitizedRequest.language,
          runtime: preflight.selected_runtime ?? sanitizedRequest.runtime,
          policy_profile: preflight.policy_profile,
        },
        diagnostics: {
          category: mapPreflightReasonToCategory(preflight.reason_code),
          code: preflight.reason_code,
          message: preflight.message,
          remediation_hint: preflight.remediation_hint,
        },
      });
      return {
        kind: 'blocked',
        metadata: result.consumption_metadata || createConsumptionMetadata(policy),
        result,
      };
    }
  }

  const useQuickRun = canUseQuickRun(policy, sanitizedRequest);
  const rawResult = useQuickRun
    ? await dependencies.quickExecute(sanitizedRequest.language, sanitizedRequest.code)
    : await dependencies.execute(sanitizedRequest);
  const result = attachConsumptionMetadata(rawResult, policy, {
    sandbox_enabled: true,
    blocked: false,
    bypassed: false,
    used_quick_run: useQuickRun,
    policy_profile:
      rawResult.policy_snapshot?.profile ?? sanitizedRequest.policy_profile ?? profile.id,
  });

  return {
    kind: 'executed',
    metadata: result.consumption_metadata || createConsumptionMetadata(policy),
    result,
  };
}
