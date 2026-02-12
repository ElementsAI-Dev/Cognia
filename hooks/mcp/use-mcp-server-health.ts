/**
 * useMcpServerHealth - Hook for MCP server health monitoring logic
 * Extracted from mcp-server-health.tsx component
 */

import { useState, useMemo, useCallback } from 'react';
import { useMcpStore } from '@/stores';
import { formatLatency, formatRelativeTimestamp } from '@/lib/mcp/format-utils';

export interface UseMcpServerHealthReturn {
  servers: ReturnType<typeof useMcpStore.getState>['servers'];
  serverHealthMap: ReturnType<typeof useMcpStore.getState>['serverHealthMap'];
  connectedServers: ReturnType<typeof useMcpStore.getState>['servers'];
  pingingServers: Set<string>;
  handlePing: (serverId: string) => Promise<void>;
  handlePingAll: () => Promise<void>;
  connectServer: (serverId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  getHealthStatus: (serverId: string) => 'healthy' | 'unhealthy' | 'unknown';
  getLatencyDisplay: (ms?: number) => string;
  getTimestampDisplay: (ts?: number) => string;
  getLatencyColor: (ms?: number) => string;
}

export function useMcpServerHealth(): UseMcpServerHealthReturn {
  const servers = useMcpStore((state) => state.servers);
  const serverHealthMap = useMcpStore((state) => state.serverHealthMap);
  const pingServer = useMcpStore((state) => state.pingServer);
  const connectServer = useMcpStore((state) => state.connectServer);
  const disconnectServer = useMcpStore((state) => state.disconnectServer);

  const [pingingServers, setPingingServers] = useState<Set<string>>(new Set());

  const connectedServers = useMemo(
    () => servers.filter((s) => s.status.type === 'connected'),
    [servers]
  );

  const handlePing = useCallback(
    async (serverId: string) => {
      setPingingServers((prev) => new Set(prev).add(serverId));
      try {
        await pingServer(serverId);
      } catch {
        // ping failure is reflected in health map
      } finally {
        setPingingServers((prev) => {
          const next = new Set(prev);
          next.delete(serverId);
          return next;
        });
      }
    },
    [pingServer]
  );

  const handlePingAll = useCallback(async () => {
    await Promise.allSettled(connectedServers.map((s) => handlePing(s.id)));
  }, [connectedServers, handlePing]);

  const getHealthStatus = useCallback(
    (serverId: string): 'healthy' | 'unhealthy' | 'unknown' => {
      const health = serverHealthMap.get(serverId);
      if (!health) return 'unknown';
      return health.isHealthy ? 'healthy' : 'unhealthy';
    },
    [serverHealthMap]
  );

  const getLatencyDisplay = useCallback((ms?: number): string => {
    return formatLatency(ms);
  }, []);

  const getTimestampDisplay = useCallback((ts?: number): string => {
    if (!ts) return '-';
    return formatRelativeTimestamp(ts);
  }, []);

  const getLatencyColor = useCallback((ms?: number): string => {
    if (ms === undefined) return 'text-muted-foreground';
    if (ms < 100) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    return 'text-destructive';
  }, []);

  return {
    servers,
    serverHealthMap,
    connectedServers,
    pingingServers,
    handlePing,
    handlePingAll,
    connectServer,
    disconnectServer,
    getHealthStatus,
    getLatencyDisplay,
    getTimestampDisplay,
    getLatencyColor,
  };
}
