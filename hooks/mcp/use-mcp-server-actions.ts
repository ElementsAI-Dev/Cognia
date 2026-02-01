/**
 * Hook for managing MCP server actions (connect, disconnect, remove, toggle)
 * Extracts action logic from mcp-settings.tsx
 */

import { useState, useCallback } from 'react';
import { useMcpStore } from '@/stores/mcp';
import type { McpServerState } from '@/types/mcp';
import { loggers } from '@/lib/logger';

const log = loggers.app;

export interface UseMcpServerActionsReturn {
  actionLoading: string | null;
  removeConfirmId: string | null;
  handleConnect: (id: string) => Promise<void>;
  handleDisconnect: (id: string) => Promise<void>;
  handleRemove: (id: string) => void;
  confirmRemove: () => Promise<void>;
  cancelRemove: () => void;
  handleToggleEnabled: (server: McpServerState) => Promise<void>;
}

export function useMcpServerActions(): UseMcpServerActionsReturn {
  const { connectServer, disconnectServer, removeServer, updateServer } = useMcpStore();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const handleConnect = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await connectServer(id);
      } catch (err) {
        log.error('Failed to connect', err as Error);
      } finally {
        setActionLoading(null);
      }
    },
    [connectServer]
  );

  const handleDisconnect = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await disconnectServer(id);
      } catch (err) {
        log.error('Failed to disconnect', err as Error);
      } finally {
        setActionLoading(null);
      }
    },
    [disconnectServer]
  );

  const handleRemove = useCallback((id: string) => {
    setRemoveConfirmId(id);
  }, []);

  const confirmRemove = useCallback(async () => {
    if (removeConfirmId) {
      try {
        await removeServer(removeConfirmId);
      } catch (err) {
        log.error('Failed to remove', err as Error);
      }
    }
    setRemoveConfirmId(null);
  }, [removeConfirmId, removeServer]);

  const cancelRemove = useCallback(() => {
    setRemoveConfirmId(null);
  }, []);

  const handleToggleEnabled = useCallback(
    async (server: McpServerState) => {
      try {
        await updateServer(server.id, {
          ...server.config,
          enabled: !server.config.enabled,
        });
      } catch (err) {
        log.error('Failed to toggle enabled', err as Error);
      }
    },
    [updateServer]
  );

  return {
    actionLoading,
    removeConfirmId,
    handleConnect,
    handleDisconnect,
    handleRemove,
    confirmRemove,
    cancelRemove,
    handleToggleEnabled,
  };
}
