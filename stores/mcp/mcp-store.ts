/**
 * MCP Store - Zustand state management for MCP servers
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type {
  McpServerState,
  McpServerConfig,
  McpTool,
  ToolCallResult,
  ResourceContent,
  PromptContent,
  LogLevel,
  McpNotificationEvent,
  ToolCallProgress,
  McpToolSelectionConfig,
  ToolUsageRecord,
  ToolSelectionResult,
  ServerHealth,
  ResourceTemplate,
  CompletionResult,
  Root,
} from '@/types/mcp';
import type { MCPLogEntry } from '@/components/mcp/mcp-log-viewer';
import { DEFAULT_TOOL_SELECTION_CONFIG } from '@/types/mcp';
import { getToolCacheManager } from '@/lib/mcp/tool-cache';
import { syncMcpServer, clearMcpServerTools } from '@/lib/context/mcp-tools-sync';
import { mcpServerRepository } from '@/lib/db/repositories/mcp-server-repository';
import { loggers } from '@/lib/logger';

const log = loggers.store;

/**
 * Active tool call tracking for parallel execution
 */
export interface ActiveToolCall {
  id: string;
  serverId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: unknown;
  error?: string;
  progress?: number;
}

/** Maximum number of log entries to keep */
const MAX_LOG_ENTRIES = 500;

interface McpState {
  // State
  servers: McpServerState[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  logs: MCPLogEntry[];

  // Active tool calls tracking for parallel execution
  activeToolCalls: Map<string, ActiveToolCall>;

  // Server health tracking
  serverHealthMap: Map<string, ServerHealth>;

  // Tool selection state
  toolSelectionConfig: McpToolSelectionConfig;
  toolUsageHistory: Map<string, ToolUsageRecord>;
  lastToolSelection: ToolSelectionResult | null;

  // Actions
  initialize: () => Promise<void>;
  loadServers: () => Promise<void>;
  addServer: (id: string, config: McpServerConfig) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  updateServer: (id: string, config: McpServerConfig) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  callTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<ToolCallResult>;
  readResource: (serverId: string, uri: string) => Promise<ResourceContent>;
  getPrompt: (
    serverId: string,
    name: string,
    args?: Record<string, unknown>
  ) => Promise<PromptContent>;
  getAllTools: () => Promise<Array<{ serverId: string; tool: McpTool }>>;
  reloadConfig: () => Promise<void>;
  pingServer: (serverId: string) => Promise<number>;
  testConnection: (serverId: string) => Promise<boolean>;
  setLogLevel: (serverId: string, level: LogLevel) => Promise<void>;
  setRoots: (serverId: string, roots: Root[]) => Promise<void>;
  getRoots: (serverId: string) => Promise<Root[]>;
  listResourceTemplates: (serverId: string) => Promise<ResourceTemplate[]>;
  complete: (
    serverId: string,
    refType: string,
    refName: string,
    argumentName: string,
    argumentValue: string
  ) => Promise<CompletionResult>;
  respondToSampling: (serverId: string, requestId: string, result: Record<string, unknown>) => Promise<void>;
  cancelRequest: (serverId: string, requestId: string, reason?: string) => Promise<void>;
  subscribeResource: (serverId: string, uri: string) => Promise<void>;
  unsubscribeResource: (serverId: string, uri: string) => Promise<void>;
  clearError: () => void;
  
  // Log actions
  addLog: (entry: Omit<MCPLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  // Tool selection actions
  setToolSelectionConfig: (config: Partial<McpToolSelectionConfig>) => void;
  recordToolUsage: (toolName: string, success: boolean, executionTime?: number) => void;
  getToolUsageHistory: () => Map<string, ToolUsageRecord>;
  setLastToolSelection: (selection: ToolSelectionResult | null) => void;
  resetToolUsageHistory: () => void;

  // Server health actions
  getServerHealth: (serverId: string) => ServerHealth | undefined;
  getAllServerHealth: () => ServerHealth[];

  // Active tool call tracking actions
  trackToolCallStart: (
    id: string,
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => void;
  trackToolCallProgress: (id: string, progress: number) => void;
  trackToolCallComplete: (id: string, result: unknown) => void;
  trackToolCallError: (id: string, error: string) => void;
  getActiveToolCalls: () => ActiveToolCall[];
  clearCompletedToolCalls: () => void;

  // Internal
  _updateServer: (state: McpServerState) => void;
  _setServers: (servers: McpServerState[]) => void;
  _cleanup: () => void;
}

// Store event listener cleanup functions
let unlistenServerUpdate: UnlistenFn | null = null;
let unlistenServersChanged: UnlistenFn | null = null;
let unlistenNotification: UnlistenFn | null = null;
let unlistenToolProgress: UnlistenFn | null = null;
let unlistenLogMessage: UnlistenFn | null = null;
let unlistenServerHealth: UnlistenFn | null = null;

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  isLoading: false,
  error: null,
  isInitialized: false,
  logs: [],

  // Active tool calls tracking
  activeToolCalls: new Map<string, ActiveToolCall>(),

  // Server health tracking
  serverHealthMap: new Map<string, ServerHealth>(),

  // Tool selection state
  toolSelectionConfig: { ...DEFAULT_TOOL_SELECTION_CONFIG },
  toolUsageHistory: new Map<string, ToolUsageRecord>(),
  lastToolSelection: null,

  initialize: async () => {
    if (get().isInitialized) return;

    // Check if we're in Tauri environment
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) {
      set({ isInitialized: true });
      return;
    }

    try {
      // Setup event listeners
      unlistenServerUpdate = await listen<McpServerState>('mcp:server-update', (event) => {
        get()._updateServer(event.payload);
      });

      unlistenServersChanged = await listen<McpServerState[]>('mcp:servers-changed', (event) => {
        get()._setServers(event.payload);
      });

      unlistenNotification = await listen<McpNotificationEvent>('mcp:notification', (event) => {
        log.debug(`MCP notification: ${JSON.stringify(event.payload)}`);
      });

      unlistenToolProgress = await listen<ToolCallProgress>('mcp:tool-call-progress', (event) => {
        const { callId, serverId, toolName, state, progress, error } = event.payload;

        // Update tool call tracking based on state
        switch (state) {
          case 'pending':
          case 'running':
            // Check if already tracked, if not start tracking
            if (!get().activeToolCalls.has(callId)) {
              get().trackToolCallStart(callId, serverId, toolName, {});
            }
            if (progress !== undefined) {
              get().trackToolCallProgress(callId, progress);
            }
            break;
          case 'completed':
            get().trackToolCallComplete(callId, undefined);
            // Record usage for analytics
            get().recordToolUsage(toolName, true);
            break;
          case 'failed':
            get().trackToolCallError(callId, error || 'Unknown error');
            // Record usage for analytics
            get().recordToolUsage(toolName, false);
            break;
          case 'cancelled':
            get().trackToolCallError(callId, 'Cancelled');
            break;
        }
      });

      // Listen for log messages from MCP servers
      unlistenLogMessage = await listen<{
        serverId: string;
        message: { level: LogLevel; message: string; logger?: string; data?: unknown };
      }>('mcp:log-message', (event) => {
        const { serverId, message } = event.payload;
        const server = get().servers.find((s) => s.id === serverId);
        get().addLog({
          level: message.level,
          message: message.message,
          serverId,
          serverName: server?.name,
          logger: message.logger,
          data: message.data,
        });
      });

      // Listen for server health updates
      unlistenServerHealth = await listen<ServerHealth>('mcp:server-health', (event) => {
        const health = event.payload;
        set((prev) => {
          const healthMap = new Map(prev.serverHealthMap);
          healthMap.set(health.serverId, health);
          return { serverHealthMap: healthMap };
        });
      });

      // Load initial servers
      await get().loadServers();

      set({ isInitialized: true });
    } catch (error) {
      log.error('Failed to initialize MCP store', error as Error);
      // Set isInitialized to true even on error to prevent infinite retry loop in browser environment
      set({ error: String(error), isInitialized: true });
    }
  },

  loadServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const servers = await invoke<McpServerState[]>('mcp_get_servers');
      set({ servers, isLoading: false });
      // Invalidate tool cache when servers change
      getToolCacheManager().invalidate();
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  addServer: async (id, config) => {
    try {
      await invoke('mcp_add_server', { id, config });
      await get().loadServers();
      // Sync to IndexedDB
      mcpServerRepository.create({ name: config.name, url: config.url || '' }).catch((err) =>
        log.error(`Failed to sync server add to IndexedDB: ${id}`, err as Error)
      );
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  removeServer: async (id) => {
    try {
      await invoke('mcp_remove_server', { id });
      await get().loadServers();
      // Remove from IndexedDB
      mcpServerRepository.delete(id).catch((err) =>
        log.error(`Failed to sync server remove to IndexedDB: ${id}`, err as Error)
      );
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateServer: async (id, config) => {
    try {
      await invoke('mcp_update_server', { id, config });
      await get().loadServers();
      // Sync to IndexedDB
      mcpServerRepository.update(id, { name: config.name, url: config.url }).catch((err) =>
        log.error(`Failed to sync server update to IndexedDB: ${id}`, err as Error)
      );
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  connectServer: async (id) => {
    try {
      await invoke('mcp_connect_server', { id });
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  disconnectServer: async (id) => {
    try {
      await invoke('mcp_disconnect_server', { id });
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  callTool: async (serverId, toolName, args) => {
    return invoke<ToolCallResult>('mcp_call_tool', {
      serverId,
      toolName,
      arguments: args,
    });
  },

  readResource: async (serverId, uri) => {
    return invoke<ResourceContent>('mcp_read_resource', {
      serverId,
      uri,
    });
  },

  getPrompt: async (serverId, name, args) => {
    return invoke<PromptContent>('mcp_get_prompt', {
      serverId,
      name,
      arguments: args,
    });
  },

  getAllTools: async () => {
    const cache = getToolCacheManager();
    const cached = cache.get('all');
    if (cached) {
      return cached;
    }

    const result = await invoke<Array<[string, McpTool]>>('mcp_get_all_tools');
    if (!Array.isArray(result)) return [];

    const tools = result.map(([serverId, tool]) => ({ serverId, tool }));
    cache.set('all', tools);
    return tools;
  },

  reloadConfig: async () => {
    try {
      await invoke('mcp_reload_config');
      await get().loadServers();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  pingServer: async (serverId) => {
    // Returns latency in milliseconds (u64 from Rust)
    const latency = await invoke<number>('mcp_ping_server', { serverId });
    return latency;
  },

  testConnection: async (serverId) => {
    return invoke<boolean>('mcp_test_connection', { serverId });
  },

  setLogLevel: async (serverId, level) => {
    return invoke('mcp_set_log_level', { serverId, level });
  },

  setRoots: async (serverId, roots) => {
    return invoke('mcp_set_roots', { serverId, roots });
  },

  getRoots: async (serverId) => {
    return invoke<Root[]>('mcp_get_roots', { serverId });
  },

  listResourceTemplates: async (serverId) => {
    return invoke<ResourceTemplate[]>('mcp_list_resource_templates', { serverId });
  },

  complete: async (serverId, refType, refName, argumentName, argumentValue) => {
    return invoke<CompletionResult>('mcp_complete', {
      serverId,
      refType,
      refName,
      argumentName,
      argumentValue,
    });
  },

  respondToSampling: async (serverId, requestId, result) => {
    return invoke('mcp_respond_sampling', { serverId, requestId, result });
  },

  cancelRequest: async (serverId, requestId, reason) => {
    return invoke('mcp_cancel_request', { serverId, requestId, reason });
  },

  subscribeResource: async (serverId, uri) => {
    return invoke('mcp_subscribe_resource', { serverId, uri });
  },

  unsubscribeResource: async (serverId, uri) => {
    return invoke('mcp_unsubscribe_resource', { serverId, uri });
  },

  clearError: () => {
    set({ error: null });
  },

  // Log actions
  addLog: (entry) => {
    set((prev) => {
      const newLog: MCPLogEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      const logs = [newLog, ...prev.logs].slice(0, MAX_LOG_ENTRIES);
      return { logs };
    });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  // Tool selection actions
  setToolSelectionConfig: (config) => {
    set((prev) => ({
      toolSelectionConfig: {
        ...prev.toolSelectionConfig,
        ...config,
      },
    }));
  },

  recordToolUsage: (toolName, success, executionTime) => {
    set((prev) => {
      const history = new Map(prev.toolUsageHistory);
      const existing = history.get(toolName);

      if (existing) {
        const newUsageCount = existing.usageCount + 1;
        const newSuccessCount = existing.successCount + (success ? 1 : 0);
        const newFailureCount = existing.failureCount + (success ? 0 : 1);
        const newAvgTime = executionTime
          ? (existing.avgExecutionTime * existing.usageCount + executionTime) / newUsageCount
          : existing.avgExecutionTime;

        history.set(toolName, {
          toolName,
          usageCount: newUsageCount,
          successCount: newSuccessCount,
          failureCount: newFailureCount,
          lastUsedAt: Date.now(),
          avgExecutionTime: newAvgTime,
        });
      } else {
        history.set(toolName, {
          toolName,
          usageCount: 1,
          successCount: success ? 1 : 0,
          failureCount: success ? 0 : 1,
          lastUsedAt: Date.now(),
          avgExecutionTime: executionTime || 0,
        });
      }

      return { toolUsageHistory: history };
    });
  },

  getToolUsageHistory: () => {
    return get().toolUsageHistory;
  },

  setLastToolSelection: (selection) => {
    set({ lastToolSelection: selection });
  },

  resetToolUsageHistory: () => {
    set({ toolUsageHistory: new Map<string, ToolUsageRecord>() });
  },

  // Server health actions
  getServerHealth: (serverId) => {
    return get().serverHealthMap.get(serverId);
  },

  getAllServerHealth: () => {
    return Array.from(get().serverHealthMap.values());
  },

  // Active tool call tracking actions
  trackToolCallStart: (id, serverId, toolName, args) => {
    set((prev) => {
      const calls = new Map(prev.activeToolCalls);
      calls.set(id, {
        id,
        serverId,
        toolName,
        args,
        status: 'running',
        startedAt: new Date(),
      });
      return { activeToolCalls: calls };
    });
  },

  trackToolCallProgress: (id, progress) => {
    set((prev) => {
      const calls = new Map(prev.activeToolCalls);
      const call = calls.get(id);
      if (call) {
        calls.set(id, { ...call, progress });
      }
      return { activeToolCalls: calls };
    });
  },

  trackToolCallComplete: (id, result) => {
    set((prev) => {
      const calls = new Map(prev.activeToolCalls);
      const call = calls.get(id);
      if (call) {
        const completedAt = new Date();
        calls.set(id, {
          ...call,
          status: 'completed',
          result,
          completedAt,
          duration: completedAt.getTime() - call.startedAt.getTime(),
        });
      }
      return { activeToolCalls: calls };
    });
  },

  trackToolCallError: (id, error) => {
    set((prev) => {
      const calls = new Map(prev.activeToolCalls);
      const call = calls.get(id);
      if (call) {
        const completedAt = new Date();
        const isTimeout = error.toLowerCase().includes('timeout');
        calls.set(id, {
          ...call,
          status: isTimeout ? 'timeout' : 'error',
          error,
          completedAt,
          duration: completedAt.getTime() - call.startedAt.getTime(),
        });
      }
      return { activeToolCalls: calls };
    });
  },

  getActiveToolCalls: () => {
    return Array.from(get().activeToolCalls.values());
  },

  clearCompletedToolCalls: () => {
    set((prev) => {
      const calls = new Map(prev.activeToolCalls);
      for (const [id, call] of calls) {
        if (call.status === 'completed' || call.status === 'error' || call.status === 'timeout') {
          calls.delete(id);
        }
      }
      return { activeToolCalls: calls };
    });
  },

  _updateServer: (state) => {
    const prev = get().servers.find((s) => s.id === state.id);
    set((p) => ({
      servers: p.servers.map((s) => (s.id === state.id ? state : s)),
    }));

    // Auto-sync tool descriptions when server status changes
    const wasConnected = prev?.status.type === 'connected';
    const isConnected = state.status.type === 'connected';
    if (isConnected && !wasConnected) {
      // Server just connected — sync tools to context files
      syncMcpServer(state.id, state.name, state.tools || [], 'connected').catch((err) =>
        log.error(`Failed to sync MCP tools for ${state.id}`, err as Error)
      );
    } else if (!isConnected && wasConnected) {
      // Server disconnected — clear synced tools
      clearMcpServerTools(state.id).catch((err) =>
        log.error(`Failed to clear MCP tools for ${state.id}`, err as Error)
      );
    }
  },

  _setServers: (servers) => {
    const prevServers = get().servers;
    set({ servers });

    // Auto-sync tool descriptions for newly connected / disconnected servers
    for (const server of servers) {
      const prev = prevServers.find((s) => s.id === server.id);
      const wasConnected = prev?.status.type === 'connected';
      const isConnected = server.status.type === 'connected';
      if (isConnected && !wasConnected) {
        syncMcpServer(server.id, server.name, server.tools || [], 'connected').catch((err) =>
          log.error(`Failed to sync MCP tools for ${server.id}`, err as Error)
        );
      } else if (!isConnected && wasConnected) {
        clearMcpServerTools(server.id).catch((err) =>
          log.error(`Failed to clear MCP tools for ${server.id}`, err as Error)
        );
      }
    }
  },

  _cleanup: () => {
    if (unlistenServerUpdate) {
      unlistenServerUpdate();
      unlistenServerUpdate = null;
    }
    if (unlistenServersChanged) {
      unlistenServersChanged();
      unlistenServersChanged = null;
    }
    if (unlistenNotification) {
      unlistenNotification();
      unlistenNotification = null;
    }
    if (unlistenToolProgress) {
      unlistenToolProgress();
      unlistenToolProgress = null;
    }
    if (unlistenLogMessage) {
      unlistenLogMessage();
      unlistenLogMessage = null;
    }
    if (unlistenServerHealth) {
      unlistenServerHealth();
      unlistenServerHealth = null;
    }
    set({ isInitialized: false, serverHealthMap: new Map<string, ServerHealth>() });
  },
}));

// Package manager helpers
export async function installNpmPackage(packageName: string): Promise<string> {
  return invoke<string>('mcp_install_npm_package', { packageName });
}

export async function installPipPackage(packageName: string): Promise<string> {
  return invoke<string>('mcp_install_pip_package', { packageName });
}

export async function checkCommandExists(command: string): Promise<boolean> {
  return invoke<boolean>('mcp_check_command_exists', { command });
}
