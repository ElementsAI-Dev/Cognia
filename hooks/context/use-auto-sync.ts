'use client';

/**
 * useAutoSync - Hook for automatic context synchronization
 *
 * Automatically syncs MCP tools and skills to context files
 * when stores change, enabling dynamic discovery by the agent.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useMcpStore, useSkillStore } from '@/stores';
import {
  runFullSync,
  startAutoSync,
  stopAutoSync,
  getLastSyncResult,
  isAutoSyncRunning,
  type AutoSyncResult,
} from '@/lib/context';
import type { Skill } from '@/types/system/skill';
import type { McpTool } from '@/types/mcp';
import { loggers } from '@/lib/logger';

const log = loggers.native;
const CHANGE_SYNC_DEBOUNCE_MS = 500;
const CHANGE_SYNC_MIN_INTERVAL_MS = 1500;

export interface UseAutoSyncOptions {
  /** Enable MCP tools sync (default: true) */
  syncMcpTools?: boolean;
  /** Enable skills sync (default: true) */
  syncSkills?: boolean;
  /** Sync interval in ms (default: 60000 = 1 minute, 0 = manual only) */
  syncIntervalMs?: number;
  /** Sync on mount (default: true) */
  syncOnMount?: boolean;
  /** Sync when data changes (default: true) */
  syncOnChange?: boolean;
}

export interface UseAutoSyncReturn {
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Last sync result */
  lastResult: AutoSyncResult | null;
  /** Last sync error */
  error: string | null;
  /** Whether auto-sync is running */
  isRunning: boolean;
  /** Trigger a manual sync */
  sync: () => Promise<void>;
  /** Start auto-sync with interval */
  start: (intervalMs?: number) => void;
  /** Stop auto-sync */
  stop: () => void;
}

export function useAutoSync(options: UseAutoSyncOptions = {}): UseAutoSyncReturn {
  const {
    syncMcpTools = true,
    syncSkills: syncSkillsEnabled = true,
    syncIntervalMs = 60000,
    syncOnMount = true,
    syncOnChange = true,
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<AutoSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Refs to track previous data for change detection
  const prevMcpServersRef = useRef<string>('');
  const prevSkillsRef = useRef<string>('');
  const pendingChangeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChangeSyncAtRef = useRef<number>(0);
  const activeSkillsRef = useRef<Skill[]>([]);
  const mcpServersRef = useRef<Array<{
    id: string;
    name: string;
    tools: McpTool[];
    status: 'connected' | 'disconnected' | 'error' | 'auth-required';
  }>>([]);

  // Get data from stores
  const mcpServers = useMcpStore((state) => state.servers);
  const skills = useSkillStore((state) => state.skills);
  const activeSkillIds = useSkillStore((state) => state.activeSkillIds);

  // Get active skills
  const activeSkills = activeSkillIds
    .map((id) => skills[id])
    .filter((s): s is Skill => s !== undefined);

  // Prepare MCP server data for sync
  const getMcpServersForSync = useCallback(() => {
    return mcpServers.map((server) => {
      // Map server status to sync-compatible status
      let syncStatus: 'connected' | 'disconnected' | 'error' | 'auth-required' = 'disconnected';
      if (typeof server.status === 'string') {
        if (server.status === 'connected') syncStatus = 'connected';
        else if (server.status === 'error') syncStatus = 'error';
        else if (server.status === 'auth-required') syncStatus = 'auth-required';
      } else if (server.status && typeof server.status === 'object' && 'type' in server.status) {
        const statusType = server.status.type;
        if (statusType === 'connected') syncStatus = 'connected';
        else if (statusType === 'error') syncStatus = 'error';
        else syncStatus = 'disconnected';
      }

      return {
        id: server.id,
        name: server.name,
        tools: server.tools || [],
        status: syncStatus,
      };
    });
  }, [mcpServers]);

  useEffect(() => {
    activeSkillsRef.current = activeSkills;
  }, [activeSkills]);

  useEffect(() => {
    mcpServersRef.current = getMcpServersForSync();
  }, [getMcpServersForSync]);

  const clearPendingChangeSync = useCallback(() => {
    if (pendingChangeSyncTimerRef.current) {
      clearTimeout(pendingChangeSyncTimerRef.current);
      pendingChangeSyncTimerRef.current = null;
    }
  }, []);

  const syncInternal = useCallback(async (origin: 'manual' | 'change' | 'mount' | 'interval') => {
    if (isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const result = await runFullSync({
        mcpServers: syncMcpTools ? mcpServersRef.current : undefined,
        skills: syncSkillsEnabled ? activeSkillsRef.current : undefined,
      });
      setLastResult(result);
      lastChangeSyncAtRef.current = Date.now();
      log.info('AutoSync completed', {
        origin,
        mcpServers: result.mcp.size,
        skills: result.skills.synced,
        duration: result.durationMs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      log.error('AutoSync failed', err as Error, {
        origin,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, syncMcpTools, syncSkillsEnabled]);

  // Run sync (manual, immediate, and clears pending debounced sync)
  const sync = useCallback(async () => {
    clearPendingChangeSync();
    await syncInternal('manual');
  }, [clearPendingChangeSync, syncInternal]);

  const scheduleChangeSync = useCallback(() => {
    clearPendingChangeSync();
    const elapsed = Date.now() - lastChangeSyncAtRef.current;
    const minIntervalDelay = Math.max(0, CHANGE_SYNC_MIN_INTERVAL_MS - elapsed);
    const delay = Math.max(CHANGE_SYNC_DEBOUNCE_MS, minIntervalDelay);

    pendingChangeSyncTimerRef.current = setTimeout(() => {
      pendingChangeSyncTimerRef.current = null;
      void syncInternal('change');
    }, delay);
  }, [clearPendingChangeSync, syncInternal]);

  // Start auto-sync
  const start = useCallback(
    (intervalMs: number = syncIntervalMs) => {
      startAutoSync(
        {
          syncMcpTools,
          syncSkills: syncSkillsEnabled,
          syncIntervalMs: intervalMs,
          onSyncComplete: (result) => {
            setLastResult(result);
            lastChangeSyncAtRef.current = Date.now();
          },
        },
        () => ({
          mcpServers: mcpServersRef.current,
          skills: activeSkillsRef.current,
        })
      );
      setIsRunning(true);
    },
    [syncMcpTools, syncSkillsEnabled, syncIntervalMs]
  );

  // Stop auto-sync
  const stop = useCallback(() => {
    clearPendingChangeSync();
    stopAutoSync();
    setIsRunning(false);
  }, [clearPendingChangeSync]);

  // Sync on mount
  useEffect(() => {
    if (syncOnMount) {
      void syncInternal('mount');
    }

    // Check if auto-sync should start
    if (syncIntervalMs > 0) {
      start(syncIntervalMs);
    }

    return () => {
      stop();
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync on data change
  useEffect(() => {
    if (!syncOnChange) return;

    const mcpKey = JSON.stringify(mcpServers.map((s) => ({ id: s.id, tools: s.tools?.length, status: s.status })));
    const skillsKey = JSON.stringify(activeSkillIds);

    // Prime previous refs without scheduling a change sync on first render.
    if (prevMcpServersRef.current === '' && prevSkillsRef.current === '') {
      prevMcpServersRef.current = mcpKey;
      prevSkillsRef.current = skillsKey;
      return;
    }

    const mcpChanged = mcpKey !== prevMcpServersRef.current;
    const skillsChanged = skillsKey !== prevSkillsRef.current;

    if (mcpChanged || skillsChanged) {
      prevMcpServersRef.current = mcpKey;
      prevSkillsRef.current = skillsKey;
      scheduleChangeSync();
    }
  }, [syncOnChange, mcpServers, activeSkillIds, scheduleChangeSync]);

  // Get cached result on mount
  useEffect(() => {
    const cached = getLastSyncResult();
    if (cached) {
      setLastResult(cached);
    }
    setIsRunning(isAutoSyncRunning());
  }, []);

  return {
    isSyncing,
    lastResult,
    error,
    isRunning,
    sync,
    start,
    stop,
  };
}
