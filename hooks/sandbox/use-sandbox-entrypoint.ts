'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  executeSandboxEntrypoint,
  resolveSandboxEntrypointAvailability,
} from '@/lib/sandbox/consumption';
import type {
  ExecutionRequest,
  SandboxEntrypointPolicy,
  SandboxExecutionResult,
} from '@/types/system/sandbox';
import { isValidLanguage } from '@/types/system/sandbox';
import { useSandbox } from './use-sandbox';

interface UseSandboxEntrypointExecutionOptions {
  policy: SandboxEntrypointPolicy;
  language?: string;
}

interface UseSandboxEntrypointExecutionReturn {
  sandboxAvailable: boolean;
  canExecute: boolean;
  shouldRenderExecuteButton: boolean;
  blockedReason: string | null;
  blockedResult: SandboxExecutionResult | null;
  result: SandboxExecutionResult | null;
  executing: boolean;
  error: string | null;
  execute: (
    code: string,
    overrides?: Partial<Omit<ExecutionRequest, 'language' | 'code'>>
  ) => Promise<SandboxExecutionResult | null>;
  reset: () => void;
}

export function useSandboxEntrypointExecution({
  policy,
  language,
}: UseSandboxEntrypointExecutionOptions): UseSandboxEntrypointExecutionReturn {
  const { isAvailable: sandboxAvailable } = useSandbox();
  const [result, setResult] = useState<SandboxExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedLanguage = language?.toLowerCase() || '';
  const availability = useMemo(
    () =>
      resolveSandboxEntrypointAvailability({
        policy,
        language: normalizedLanguage,
        sandboxAvailable,
        isLanguageSupported: isValidLanguage(normalizedLanguage),
      }),
    [policy, normalizedLanguage, sandboxAvailable]
  );

  const execute = useCallback(
    async (
      code: string,
      overrides: Partial<Omit<ExecutionRequest, 'language' | 'code'>> = {}
    ): Promise<SandboxExecutionResult | null> => {
      if (!normalizedLanguage) {
        return null;
      }

      if (availability.blockedResult) {
        setResult(availability.blockedResult);
        setError(availability.blockedResult.error);
        return availability.blockedResult;
      }

      try {
        setExecuting(true);
        setError(null);
        setResult(null);

        const outcome = await executeSandboxEntrypoint({
          policy,
          request: {
            language: normalizedLanguage,
            code,
            ...overrides,
          },
        });

        if (outcome.result) {
          setResult(outcome.result);
          setError(outcome.result.error);
          return outcome.result;
        }

        setResult(null);
        setError(null);
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [availability.blockedResult, normalizedLanguage, policy]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    sandboxAvailable,
    canExecute: availability.canExecute,
    shouldRenderExecuteButton: availability.shouldRenderExecuteButton,
    blockedReason: availability.blockedReason,
    blockedResult: availability.blockedResult,
    result,
    executing,
    error,
    execute,
    reset,
  };
}
