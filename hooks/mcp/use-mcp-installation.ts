/**
 * Hook for managing MCP server installation process
 * Extracts installation logic from mcp-marketplace-detail-dialog.tsx and mcp-install-wizard.tsx
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMcpMarketplaceStore, useMcpStore } from '@/stores/mcp';
import type { McpMarketplaceItem, McpDownloadResponse } from '@/types/mcp/mcp-marketplace';
import type { McpServerConfig } from '@/types/mcp';
import { parseInstallationConfig, type McpInstallConfig } from '@/lib/mcp/marketplace';
import { checkMcpEnvironment, type EnvironmentCheckResult } from '@/lib/mcp/marketplace-utils';

export interface UseMcpInstallationOptions {
  item: McpMarketplaceItem | null;
  isOpen: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface UseMcpInstallationReturn {
  // State
  isInstalling: boolean;
  installError: string | null;
  envValues: Record<string, string>;
  envCheck: EnvironmentCheckResult | null;
  isCheckingEnv: boolean;
  installConfig: McpInstallConfig | null;
  isCurrentlyInstalled: boolean;

  // Actions
  setEnvValue: (key: string, value: string) => void;
  setEnvValues: (values: Record<string, string>) => void;
  handleInstall: () => Promise<void>;
  resetInstallation: () => void;
}

export function useMcpInstallation(options: UseMcpInstallationOptions): UseMcpInstallationReturn {
  const { item, isOpen, onSuccess, onError } = options;

  const {
    downloadDetails,
    getItemDetails,
    setInstallStatus,
    getInstallStatus,
    linkInstalledServer,
    getLinkedServerId,
  } = useMcpMarketplaceStore();

  const { addServer, servers } = useMcpStore();

  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [envValues, setEnvValuesState] = useState<Record<string, string>>({});
  const [envCheck, setEnvCheck] = useState<EnvironmentCheckResult | null>(null);
  const [isCheckingEnv, setIsCheckingEnv] = useState(false);

  // Check environment when dialog opens for stdio connections
  useEffect(() => {
    if (isOpen && item && !item.remote) {
      setIsCheckingEnv(true);
      checkMcpEnvironment()
        .then(setEnvCheck)
        .finally(() => setIsCheckingEnv(false));
    }
  }, [isOpen, item]);

  // Parse installation configuration
  const installConfig = useMemo(() => {
    const currentDetails = item ? getItemDetails(item) || downloadDetails : null;
    if (!item || !currentDetails) return null;
    return parseInstallationConfig(item, currentDetails as McpDownloadResponse);
  }, [item, downloadDetails, getItemDetails]);

  // Initialize env values when install config changes
  useEffect(() => {
    if (installConfig?.envKeys) {
      const initialEnv: Record<string, string> = {};
      installConfig.envKeys.forEach((key) => {
        initialEnv[key] = '';
      });
      setEnvValuesState(initialEnv);
    }
  }, [installConfig]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setInstallError(null);
      setIsInstalling(false);
      setEnvValuesState({});
      setEnvCheck(null);
    }
  }, [isOpen]);

  // Check if item is installed
  const isCurrentlyInstalled = useMemo(() => {
    if (!item) return false;
    const installStatus = getInstallStatus(item);
    const linkedServerId = getLinkedServerId(item);
    const isInstalledInServers = servers.some(
      (server) =>
        server.id === linkedServerId ||
        server.id === item.mcpId ||
        server.name === item.mcpId
    );
    return isInstalledInServers || installStatus === 'installed';
  }, [item, servers, getInstallStatus, getLinkedServerId]);

  const setEnvValue = useCallback((key: string, value: string) => {
    setEnvValuesState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setEnvValues = useCallback((values: Record<string, string>) => {
    setEnvValuesState(values);
  }, []);

  const resetInstallation = useCallback(() => {
    setInstallError(null);
    setIsInstalling(false);
    setEnvValuesState({});
    setEnvCheck(null);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!item) return;

    setIsInstalling(true);
    setInstallError(null);
    setInstallStatus(item, 'installing');

    try {
      if (!installConfig || installConfig.validationStatus !== 'valid' || installConfig.mode !== 'automatic') {
        const reason =
          installConfig?.validationError || 'Unable to derive install plan from marketplace metadata.';
        setInstallError(reason);
        setInstallStatus(item, 'error', reason);
        onError?.(reason);
        return;
      }

      // Build environment variables from form
      const env: Record<string, string> = {};
      Object.entries(envValues).forEach(([key, value]) => {
        if (value.trim()) {
          env[key] = value.trim();
        }
      });

      // Create server config
      const serverConfig: McpServerConfig = {
        name: item.name,
        command: installConfig.command,
        args: installConfig.args,
        env,
        connectionType: installConfig.connectionType,
        url: installConfig.url,
        enabled: true,
        autoStart: false,
      };

      await addServer(item.mcpId, serverConfig);
      linkInstalledServer(item, item.mcpId);
      setInstallStatus(item, 'installed');
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to install MCP server';
      setInstallError(errorMessage);
      setInstallStatus(item, 'error', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsInstalling(false);
    }
  }, [item, installConfig, envValues, addServer, setInstallStatus, linkInstalledServer, onSuccess, onError]);

  return {
    isInstalling,
    installError,
    envValues,
    envCheck,
    isCheckingEnv,
    installConfig,
    isCurrentlyInstalled,
    setEnvValue,
    setEnvValues,
    handleInstall,
    resetInstallation,
  };
}
