import { DEFAULT_SANDBOX_CONFIG, type SandboxExecutionResult } from '@/types/system/sandbox';
import {
  SANDBOX_ENTRYPOINT_POLICIES,
  executeSandboxEntrypoint,
  resolveSandboxEntrypointAvailability,
} from './index';

function createExecutionResult(overrides: Partial<SandboxExecutionResult> = {}): SandboxExecutionResult {
  return {
    id: 'exec-1',
    status: 'completed',
    stdout: 'ok',
    stderr: '',
    exit_code: 0,
    execution_time_ms: 12,
    memory_used_bytes: 128,
    error: null,
    runtime: 'native',
    language: 'python',
    ...overrides,
  };
}

describe('sandbox consumption contract', () => {
  it('returns a blocked interactive state when sandbox is unavailable', () => {
    const state = resolveSandboxEntrypointAvailability({
      policy: SANDBOX_ENTRYPOINT_POLICIES.chatCodeBlock,
      language: 'python',
      sandboxAvailable: false,
      isLanguageSupported: true,
    });

    expect(state.canExecute).toBe(false);
    expect(state.shouldRenderExecuteButton).toBe(true);
    expect(state.blockedResult).not.toBeNull();
    expect(state.blockedResult?.diagnostics).toEqual(
      expect.objectContaining({
        category: 'runtime_unavailable',
      })
    );
    expect(state.blockedResult?.consumption_metadata).toEqual(
      expect.objectContaining({
        entrypoint: 'chat-code-block',
        blocked: true,
        degraded_behavior: 'disable',
      })
    );
  });

  it('blocks workflow execution before raw execute when preflight fails', async () => {
    const execute = jest.fn();

    const outcome = await executeSandboxEntrypoint(
      {
        policy: SANDBOX_ENTRYPOINT_POLICIES.workflowCodeStep,
        request: {
          language: 'python',
          code: 'print(1)',
        },
      },
      {
        isDesktopRuntime: () => true,
        isSandboxAvailable: async () => true,
        getSandboxStatus: async () => ({
          available_runtimes: [],
          supported_languages: [],
          config: DEFAULT_SANDBOX_CONFIG,
        }),
        preflight: async () => ({
          status: 'blocked',
          reason_code: 'runtime_unavailable',
          message: 'Python runtime is unavailable.',
          remediation_hint: 'Install a desktop runtime.',
          selected_runtime: null,
          policy_profile: 'balanced',
        }),
        execute,
        quickExecute: jest.fn(),
      }
    );

    expect(outcome.kind).toBe('blocked');
    expect(execute).not.toHaveBeenCalled();
    expect(outcome.result?.diagnostics).toEqual(
      expect.objectContaining({
        category: 'runtime_unavailable',
        code: 'runtime_unavailable',
      })
    );
    expect(outcome.result?.consumption_metadata).toEqual(
      expect.objectContaining({
        entrypoint: 'workflow-code-step',
        blocked: true,
      })
    );
  });

  it('rejects override values that exceed the active policy profile before preflight', async () => {
    const preflight = jest.fn();

    const outcome = await executeSandboxEntrypoint(
      {
        policy: SANDBOX_ENTRYPOINT_POLICIES.workflowCodeStep,
        request: {
          language: 'python',
          code: 'print(1)',
          network_enabled: true,
        },
      },
      {
        isDesktopRuntime: () => true,
        isSandboxAvailable: async () => true,
        getSandboxStatus: async () => ({
          available_runtimes: [],
          supported_languages: [],
          config: {
            ...DEFAULT_SANDBOX_CONFIG,
            active_policy_profile: 'strict',
          },
        }),
        preflight,
        execute: jest.fn(),
        quickExecute: jest.fn(),
      }
    );

    expect(outcome.kind).toBe('blocked');
    expect(preflight).not.toHaveBeenCalled();
    expect(outcome.result?.diagnostics).toEqual(
      expect.objectContaining({
        category: 'security_policy',
        code: 'network_not_allowed',
      })
    );
  });

  it('attaches explicit bypass metadata when scheduler execution disables sandboxing', async () => {
    const outcome = await executeSandboxEntrypoint(
      {
        policy: SANDBOX_ENTRYPOINT_POLICIES.schedulerScript,
        request: {
          language: 'javascript',
          code: 'console.log("test")',
        },
        bypassSandbox: true,
      },
      {
        isDesktopRuntime: () => true,
        isSandboxAvailable: async () => true,
        getSandboxStatus: async () => ({
          available_runtimes: [],
          supported_languages: [],
          config: DEFAULT_SANDBOX_CONFIG,
        }),
        preflight: jest.fn(),
        execute: jest.fn(),
        quickExecute: jest.fn(),
      }
    );

    expect(outcome.kind).toBe('bypassed');
    expect(outcome.result).toBeNull();
    expect(outcome.metadata).toEqual(
      expect.objectContaining({
        entrypoint: 'scheduler-script',
        bypassed: true,
        sandbox_enabled: false,
      })
    );
  });

  it('normalizes executed results and attaches entrypoint metadata', async () => {
    const execute = jest.fn().mockResolvedValue(createExecutionResult());

    const outcome = await executeSandboxEntrypoint(
      {
        policy: SANDBOX_ENTRYPOINT_POLICIES.workflowCodeStep,
        request: {
          language: 'python',
          code: 'print(1)',
        },
      },
      {
        isDesktopRuntime: () => true,
        isSandboxAvailable: async () => true,
        getSandboxStatus: async () => ({
          available_runtimes: [],
          supported_languages: [],
          config: DEFAULT_SANDBOX_CONFIG,
        }),
        preflight: async () => ({
          status: 'ready',
          reason_code: 'ok',
          message: 'Ready',
          remediation_hint: undefined,
          selected_runtime: 'native',
          policy_profile: 'balanced',
        }),
        execute,
        quickExecute: jest.fn(),
      }
    );

    expect(outcome.kind).toBe('executed');
    expect(outcome.result?.lifecycle_status).toBe('success');
    expect(outcome.result?.consumption_metadata).toEqual(
      expect.objectContaining({
        entrypoint: 'workflow-code-step',
        blocked: false,
        bypassed: false,
      })
    );
  });
});
