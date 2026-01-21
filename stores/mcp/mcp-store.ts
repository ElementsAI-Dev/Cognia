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
} from '@/types/mcp';
import { DEFAULT_TOOL_SELECTION_CONFIG } from '@/types/mcp';

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

interface McpState {
  // State
  servers: McpServerState[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Active tool calls tracking for parallel execution
  activeToolCalls: Map<string, ActiveToolCall>;
  
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
  setLogLevel: (serverId: string, level: LogLevel) => Promise<void>;
  clearError: () => void;
  
  // Tool selection actions
  setToolSelectionConfig: (config: Partial<McpToolSelectionConfig>) => void;
  recordToolUsage: (toolName: string, success: boolean, executionTime?: number) => void;
  getToolUsageHistory: () => Map<string, ToolUsageRecord>;
  setLastToolSelection: (selection: ToolSelectionResult | null) => void;
  resetToolUsageHistory: () => void;
  
  // Active tool call tracking actions
  trackToolCallStart: (id: string, serverId: string, toolName: string, args: Record<string, unknown>) => void;
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

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  isLoading: false,
  error: null,
  isInitialized: false,
  
  // Active tool calls tracking
  activeToolCalls: new Map<string, ActiveToolCall>(),
  
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
      unlistenServerUpdate = await listen<McpServerState>(
        'mcp:server-update',
        (event) => {
          get()._updateServer(event.payload);
        }
      );

      unlistenServersChanged = await listen<McpServerState[]>(
        'mcp:servers-changed',
        (event) => {
          get()._setServers(event.payload);
        }
      );

      unlistenNotification = await listen<McpNotificationEvent>(
        'mcp:notification',
        (event) => {
          console.log('MCP notification:', event.payload);
        }
      );

      unlistenToolProgress = await listen<ToolCallProgress>(
        'mcp:tool-call-progress',
        (event) => {
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
        }
      );

      // Load initial servers
      await get().loadServers();

      set({ isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize MCP store:', error);
      // Set isInitialized to true even on error to prevent infinite retry loop in browser environment
      set({ error: String(error), isInitialized: true });
    }
  },

  loadServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const servers = await invoke<McpServerState[]>('mcp_get_servers');
      set({ servers, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  addServer: async (id, config) => {
    try {
      await invoke('mcp_add_server', { id, config });
      await get().loadServers();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  removeServer: async (id) => {
    try {
      await invoke('mcp_remove_server', { id });
      await get().loadServers();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateServer: async (id, config) => {
    try {
      await invoke('mcp_update_server', { id, config });
      await get().loadServers();
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
    const result = await invoke<Array<[string, McpTool]>>('mcp_get_all_tools');
    if (!Array.isArray(result)) return [];
    return result.map(([serverId, tool]) => ({ serverId, tool }));
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
    return invoke<number>('mcp_ping_server', { serverId });
  },

  setLogLevel: async (serverId, level) => {
    return invoke('mcp_set_log_level', { serverId, level });
  },

  clearError: () => {
    set({ error: null });
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
    set((prev) => ({
      servers: prev.servers.map((s) => (s.id === state.id ? state : s)),
    }));
  },

  _setServers: (servers) => {
    set({ servers });
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
    set({ isInitialized: false });
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
