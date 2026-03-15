/**
 * Code Step Executor
 * Executes code via sandbox runtime (Tauri).
 */

import type { WorkflowStepDefinition } from './types';
import {
  SANDBOX_ENTRYPOINT_POLICIES,
  executeSandboxEntrypoint,
} from '@/lib/sandbox/consumption';

function timeoutMsToSecs(timeoutMs: number): number {
  return Math.max(1, Math.ceil(timeoutMs / 1000));
}

export async function executeCodeStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.code) {
    throw new Error('Code step requires code');
  }

  try {
    const codeSandbox = step.codeSandbox;
    const resolvedTimeoutSecs =
      typeof codeSandbox?.timeoutMs === 'number'
        ? timeoutMsToSecs(codeSandbox.timeoutMs)
        : typeof step.timeout === 'number'
          ? timeoutMsToSecs(step.timeout)
          : undefined;

    const outcome = await executeSandboxEntrypoint({
      policy: SANDBOX_ENTRYPOINT_POLICIES.workflowCodeStep,
      request: {
        language: step.language || 'javascript',
        code: step.code,
        stdin: JSON.stringify(input),
        timeout_secs: resolvedTimeoutSecs,
        memory_limit_mb: codeSandbox?.memoryLimitMb,
        network_enabled: codeSandbox?.networkEnabled,
        runtime: codeSandbox?.runtime && codeSandbox.runtime !== 'auto'
          ? codeSandbox.runtime
          : undefined,
        env: codeSandbox?.env,
        args: codeSandbox?.args,
        files: codeSandbox?.files,
      },
    });

    const result = outcome.result;
    if (!result) {
      throw new Error('Sandbox contract returned no execution result');
    }

    if (outcome.kind !== 'executed' || result.lifecycle_status === 'error') {
      throw new Error(result.error || result.diagnostics?.message || 'Execution failed');
    }

    const parsedOutput = (() => {
      if (!result.stdout) {
        return null;
      }
      try {
        return JSON.parse(result.stdout) as unknown;
      } catch {
        return result.stdout;
      }
    })();

    return {
      result: parsedOutput,
      stderr: result.stderr,
      runtime: result.runtime,
      exitCode: result.exit_code,
      executionTimeMs: result.execution_time_ms,
      diagnostics: result.diagnostics,
      consumptionMetadata: result.consumption_metadata,
    };
  } catch (error) {
    throw new Error(
      `Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
