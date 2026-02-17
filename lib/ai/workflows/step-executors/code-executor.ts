/**
 * Code Step Executor
 * Executes code via sandbox runtime (Tauri).
 */

import type { WorkflowStepDefinition } from './types';
import { executeCode as executeSandboxCode } from '@/lib/native/sandbox';
import { isTauri } from '@/lib/utils';

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

  if (!isTauri()) {
    throw new Error('Code step execution requires desktop runtime (Tauri sandbox)');
  }

  try {
    const codeSandbox = step.codeSandbox;
    const resolvedTimeoutSecs =
      typeof codeSandbox?.timeoutMs === 'number'
        ? timeoutMsToSecs(codeSandbox.timeoutMs)
        : typeof step.timeout === 'number'
          ? timeoutMsToSecs(step.timeout)
          : undefined;

    const result = await executeSandboxCode({
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
    });

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
    };
  } catch (error) {
    throw new Error(
      `Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
