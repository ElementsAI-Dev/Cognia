import type {
  SandboxExecutionRecord,
  SandboxExecutionResult,
  SandboxPolicyProfile,
} from '@/types/system/sandbox';
import {
  normalizeExecutionRecord,
  normalizeExecutionResult,
  normalizeLifecycleStatus,
  resolveSandboxPolicyProfile,
  toLegacyExecutionStatus,
  validateExecutionPolicyBounds,
} from './compat';

describe('sandbox compat', () => {
  it('normalizes legacy statuses into canonical lifecycle statuses', () => {
    expect(normalizeLifecycleStatus('pending')).toBe('queued');
    expect(normalizeLifecycleStatus('completed')).toBe('success');
    expect(normalizeLifecycleStatus('failed')).toBe('error');
  });

  it('maps canonical lifecycle statuses back to legacy statuses', () => {
    expect(toLegacyExecutionStatus('queued')).toBe('pending');
    expect(toLegacyExecutionStatus('success')).toBe('completed');
    expect(toLegacyExecutionStatus('error')).toBe('failed');
  });

  it('normalizes execution results with fallback diagnostics', () => {
    const result: SandboxExecutionResult = {
      id: 'exec-1',
      status: 'failed',
      stdout: '',
      stderr: 'boom',
      exit_code: 1,
      execution_time_ms: 12,
      memory_used_bytes: null,
      error: 'boom',
      runtime: 'docker',
      language: 'python',
    };

    const normalized = normalizeExecutionResult(result);
    expect(normalized.lifecycle_status).toBe('error');
    expect(normalized.diagnostics?.code).toBe('legacy_error');
  });

  it('normalizes execution records with canonical lifecycle status', () => {
    const record: SandboxExecutionRecord = {
      id: 'exec-2',
      session_id: null,
      language: 'python',
      code: 'print(1)',
      stdin: null,
      stdout: '1',
      stderr: '',
      exit_code: 0,
      status: 'completed',
      runtime: 'docker',
      execution_time_ms: 20,
      memory_used_bytes: null,
      error: null,
      created_at: new Date().toISOString(),
      tags: [],
      is_favorite: false,
    };

    const normalized = normalizeExecutionRecord(record);
    expect(normalized.lifecycle_status).toBe('success');
    expect(normalized.diagnostics).toBeNull();
  });

  it('resolves policy profile from defaults', () => {
    const profile = resolveSandboxPolicyProfile(undefined, 'strict');
    expect(profile.id).toBe('strict');
    expect(profile.max_timeout_secs).toBeGreaterThan(0);
  });

  it('validates bounds against policy profile', () => {
    const profile: SandboxPolicyProfile = {
      id: 'strict',
      name: 'Strict',
      max_timeout_secs: 30,
      max_memory_limit_mb: 256,
      allow_network: false,
      allowed_runtimes: ['docker', 'podman'],
    };

    const issues = validateExecutionPolicyBounds(
      {
        timeout_secs: 60,
        memory_limit_mb: 300,
        network_enabled: true,
        runtime: 'native',
      },
      profile,
      false
    );

    expect(issues.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'timeout_out_of_bounds',
        'memory_out_of_bounds',
        'network_not_allowed',
        'runtime_not_allowed',
      ])
    );
  });
});
