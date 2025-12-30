/**
 * useEnvironment Hook - React hook for environment management
 *
 * Provides a convenient interface for:
 * - Checking tool installation status
 * - Installing/uninstalling tools
 * - Listening for installation progress
 */

import { useCallback, useEffect, useRef } from 'react';
import { useEnvironmentStore } from '@/stores/environment-store';
import {
  environmentService,
  isEnvironmentAvailable,
} from '@/lib/native/environment';
import type { EnvironmentTool, ToolStatus, InstallProgress } from '@/types/environment';

export interface UseEnvironmentReturn {
  // State
  platform: string;
  tools: Record<EnvironmentTool, ToolStatus>;
  isRefreshing: boolean;
  isInstalling: boolean;
  installProgress: InstallProgress | null;
  error: string | null;
  isAvailable: boolean;

  // Actions
  refreshStatus: () => Promise<void>;
  checkTool: (tool: EnvironmentTool) => Promise<ToolStatus | null>;
  installTool: (tool: EnvironmentTool) => Promise<boolean>;
  uninstallTool: (tool: EnvironmentTool) => Promise<boolean>;
  openToolWebsite: (tool: EnvironmentTool) => Promise<void>;
  clearError: () => void;
}

export function useEnvironment(): UseEnvironmentReturn {
  const {
    platform,
    tools,
    isRefreshing,
    isInstalling,
    installProgress,
    globalError,
    setPlatform,
    setToolStatus,
    setAllToolStatuses,
    setRefreshing,
    startInstallation,
    completeInstallation,
    setInstallProgress,
    setGlobalError,
    clearError,
  } = useEnvironmentStore();

  const unlistenRef = useRef<(() => void) | null>(null);
  const isAvailable = isEnvironmentAvailable();

  // Set up progress listener
  useEffect(() => {
    if (!isAvailable) return;

    const setupListener = async () => {
      unlistenRef.current = await environmentService.onInstallProgress(
        (progress: InstallProgress) => {
          setInstallProgress(progress);

          // Update tool status based on progress
          if (progress.stage === 'done') {
            setToolStatus(progress.tool, {
              status: 'installed',
              installed: true,
              error: null,
            });
          } else if (progress.stage === 'error') {
            setToolStatus(progress.tool, {
              status: 'error',
              error: progress.error || 'Installation failed',
            });
          }
        }
      );
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [isAvailable, setInstallProgress, setToolStatus]);

  // Initialize platform on mount
  useEffect(() => {
    if (!isAvailable) return;

    const initPlatform = async () => {
      const p = await environmentService.getPlatform();
      setPlatform(p);
    };

    initPlatform();
  }, [isAvailable, setPlatform]);

  // Refresh all tool statuses
  const refreshStatus = useCallback(async () => {
    if (!isAvailable) return;

    setRefreshing(true);
    setGlobalError(null);

    try {
      const statuses = await environmentService.checkAllTools();
      const statusMap = statuses.reduce(
        (acc, status) => {
          acc[status.tool] = status;
          return acc;
        },
        {} as Record<EnvironmentTool, ToolStatus>
      );
      setAllToolStatuses(statusMap);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [isAvailable, setRefreshing, setGlobalError, setAllToolStatuses]);

  // Check a specific tool
  const checkTool = useCallback(
    async (tool: EnvironmentTool): Promise<ToolStatus | null> => {
      if (!isAvailable) return null;

      setToolStatus(tool, { status: 'checking' });

      try {
        const status = await environmentService.checkTool(tool);
        setToolStatus(tool, status);
        return status;
      } catch (err) {
        setToolStatus(tool, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    },
    [isAvailable, setToolStatus]
  );

  // Install a tool
  const installTool = useCallback(
    async (tool: EnvironmentTool): Promise<boolean> => {
      if (!isAvailable) return false;

      startInstallation(tool);

      try {
        const status = await environmentService.installTool(tool);
        completeInstallation(tool, status.installed, status.error || undefined);
        return status.installed;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        completeInstallation(tool, false, errorMsg);
        return false;
      }
    },
    [isAvailable, startInstallation, completeInstallation]
  );

  // Uninstall a tool
  const uninstallTool = useCallback(
    async (tool: EnvironmentTool): Promise<boolean> => {
      if (!isAvailable) return false;

      try {
        const success = await environmentService.uninstallTool(tool);
        if (success) {
          setToolStatus(tool, {
            installed: false,
            status: 'not_installed',
            version: null,
            path: null,
          });
        }
        return success;
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [isAvailable, setToolStatus, setGlobalError]
  );

  // Open tool website
  const openToolWebsite = useCallback(
    async (tool: EnvironmentTool): Promise<void> => {
      await environmentService.openToolWebsite(tool);
    },
    []
  );

  return {
    platform,
    tools,
    isRefreshing,
    isInstalling,
    installProgress,
    error: globalError,
    isAvailable,
    refreshStatus,
    checkTool,
    installTool,
    uninstallTool,
    openToolWebsite,
    clearError,
  };
}

export default useEnvironment;
