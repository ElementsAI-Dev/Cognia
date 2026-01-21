/**
 * Hook for checking MCP environment requirements
 * Provides environment status for installation decisions
 */

import { useState, useEffect, useCallback } from 'react';
import { checkMcpEnvironment, type EnvironmentCheckResult } from '@/lib/mcp/marketplace-utils';

export interface UseMcpEnvironmentCheckOptions {
  autoCheck?: boolean;
  checkOnMount?: boolean;
}

export interface UseMcpEnvironmentCheckReturn {
  envCheck: EnvironmentCheckResult | null;
  isChecking: boolean;
  error: string | null;
  runCheck: () => Promise<EnvironmentCheckResult>;
  isSupported: boolean;
}

export function useMcpEnvironmentCheck(
  options: UseMcpEnvironmentCheckOptions = {}
): UseMcpEnvironmentCheckReturn {
  const { checkOnMount = false } = options;

  const [envCheck, setEnvCheck] = useState<EnvironmentCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const result = await checkMcpEnvironment();
      setEnvCheck(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check environment';
      setError(errorMessage);
      const failedResult: EnvironmentCheckResult = {
        supported: false,
        hasNode: false,
        hasNpx: false,
        missingDeps: [],
        message: errorMessage,
      };
      setEnvCheck(failedResult);
      return failedResult;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check on mount if enabled
  useEffect(() => {
    if (checkOnMount) {
      runCheck();
    }
  }, [checkOnMount, runCheck]);

  const isSupported = envCheck?.supported ?? false;

  return {
    envCheck,
    isChecking,
    error,
    runCheck,
    isSupported,
  };
}
