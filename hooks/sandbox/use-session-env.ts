/**
 * useSessionEnv - Hook for managing session-level virtual environment context
 *
 * Provides environment context for the current session, with fallback to
 * global active environment or project-linked environment.
 */

import { useMemo, useCallback } from 'react';
import { useSessionStore } from '@/stores/chat';
import { useVirtualEnvStore } from '@/stores/system';
import type { VirtualEnvInfo } from '@/types/system/environment';

export interface SessionEnvContext {
  /** Current session's environment ID */
  envId: string | null;
  /** Current session's environment path */
  envPath: string | null;
  /** Full environment info if available */
  environment: VirtualEnvInfo | null;
  /** Source of the environment (session, project, global, or none) */
  source: 'session' | 'project' | 'global' | 'none';
  /** Whether an environment is available */
  hasEnvironment: boolean;
  /** Set the session's environment */
  setEnvironment: (envId: string | null, envPath?: string | null) => void;
  /** Clear the session's environment */
  clearEnvironment: () => void;
  /** All available environments for selection */
  availableEnvironments: VirtualEnvInfo[];
}

/**
 * Hook to get and manage the current session's virtual environment context
 *
 * Resolution order:
 * 1. Session-specific environment (if set)
 * 2. Project-linked environment (if session has projectId)
 * 3. Global active environment (fallback)
 */
export function useSessionEnv(sessionId?: string): SessionEnvContext {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const setSessionEnvironment = useSessionStore((s) => s.setSessionEnvironment);
  const clearSessionEnvironment = useSessionStore((s) => s.clearSessionEnvironment);

  const environments = useVirtualEnvStore((s) => s.environments);
  const globalActiveEnvId = useVirtualEnvStore((s) => s.activeEnvId);
  const projectConfigs = useVirtualEnvStore((s) => s.projectConfigs);

  const effectiveSessionId = sessionId || activeSessionId;
  const session = sessions.find((s) => s.id === effectiveSessionId);

  const resolved = useMemo(() => {
    // 1. Check session-specific environment
    if (session?.virtualEnvId) {
      const env = environments.find((e) => e.id === session.virtualEnvId);
      if (env) {
        return {
          envId: env.id,
          envPath: env.path,
          environment: env,
          source: 'session' as const,
        };
      }
    }

    // 2. Check project-linked environment
    if (session?.projectId) {
      const projectConfig = projectConfigs.find((c) => c.id === session.projectId);
      if (projectConfig?.virtualEnvId) {
        const env = environments.find((e) => e.id === projectConfig.virtualEnvId);
        if (env) {
          return {
            envId: env.id,
            envPath: env.path,
            environment: env,
            source: 'project' as const,
          };
        }
      }
    }

    // 3. Fallback to global active environment
    if (globalActiveEnvId) {
      const env = environments.find((e) => e.id === globalActiveEnvId);
      if (env) {
        return {
          envId: env.id,
          envPath: env.path,
          environment: env,
          source: 'global' as const,
        };
      }
    }

    // No environment available
    return {
      envId: null,
      envPath: null,
      environment: null,
      source: 'none' as const,
    };
  }, [session, environments, projectConfigs, globalActiveEnvId]);

  const setEnvironment = useCallback(
    (envId: string | null, envPath?: string | null) => {
      if (effectiveSessionId) {
        const env = envId ? environments.find((e) => e.id === envId) : null;
        setSessionEnvironment(effectiveSessionId, envId, envPath || env?.path || null);
      }
    },
    [effectiveSessionId, environments, setSessionEnvironment]
  );

  const clearEnvironment = useCallback(() => {
    if (effectiveSessionId) {
      clearSessionEnvironment(effectiveSessionId);
    }
  }, [effectiveSessionId, clearSessionEnvironment]);

  return {
    ...resolved,
    hasEnvironment: resolved.envId !== null,
    setEnvironment,
    clearEnvironment,
    availableEnvironments: environments,
  };
}

/**
 * Get environment context for a specific session (non-hook version for use in callbacks)
 */
export function getSessionEnvContext(
  sessionId: string,
  sessions: ReturnType<typeof useSessionStore.getState>['sessions'],
  environments: VirtualEnvInfo[],
  projectConfigs: ReturnType<typeof useVirtualEnvStore.getState>['projectConfigs'],
  globalActiveEnvId: string | null
): { envId: string | null; envPath: string | null; source: string } {
  const session = sessions.find((s) => s.id === sessionId);

  // 1. Session-specific
  if (session?.virtualEnvId) {
    const env = environments.find((e) => e.id === session.virtualEnvId);
    if (env) return { envId: env.id, envPath: env.path, source: 'session' };
  }

  // 2. Project-linked
  if (session?.projectId) {
    const projectConfig = projectConfigs.find((c) => c.id === session.projectId);
    if (projectConfig?.virtualEnvId) {
      const env = environments.find((e) => e.id === projectConfig.virtualEnvId);
      if (env) return { envId: env.id, envPath: env.path, source: 'project' };
    }
  }

  // 3. Global
  if (globalActiveEnvId) {
    const env = environments.find((e) => e.id === globalActiveEnvId);
    if (env) return { envId: env.id, envPath: env.path, source: 'global' };
  }

  return { envId: null, envPath: null, source: 'none' };
}

/**
 * Selector to check if current session has an environment
 */
export function selectSessionHasEnv(sessionId: string | null): boolean {
  if (!sessionId) return false;

  const session = useSessionStore.getState().sessions.find((s) => s.id === sessionId);
  if (session?.virtualEnvId) return true;

  const { environments, projectConfigs, activeEnvId } = useVirtualEnvStore.getState();

  if (session?.projectId) {
    const config = projectConfigs.find((c) => c.id === session.projectId);
    if (config?.virtualEnvId && environments.some((e) => e.id === config.virtualEnvId)) {
      return true;
    }
  }

  return activeEnvId !== null && environments.some((e) => e.id === activeEnvId);
}

export default useSessionEnv;
