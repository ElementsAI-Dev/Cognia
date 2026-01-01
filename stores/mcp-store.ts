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
} from '@/types/mcp';

interface McpState {
  // State
  servers: McpServerState[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

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
          console.log('Tool call progress:', event.payload);
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
