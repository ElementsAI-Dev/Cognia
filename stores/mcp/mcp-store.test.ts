/**
 * Tests for MCP Store
 */

import { useMcpStore } from './mcp-store';
import { act } from '@testing-library/react';
import type {
  McpServerConfig,
  McpServerState,
  McpServerStatus,
  ToolUsageRecord,
} from '@/types/mcp';
import { DEFAULT_TOOL_SELECTION_CONFIG } from '@/types/mcp';

// Mock Tauri environment
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {},
  writable: true,
});

// Mock Tauri APIs
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn().mockResolvedValue(jest.fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;

// Helper to create mock server config
const createMockConfig = (name: string): McpServerConfig => ({
  name,
  command: 'npx',
  args: ['server'],
  env: {},
  connectionType: 'stdio',
  enabled: true,
  autoStart: false,
});

// Helper to create mock server state
const createMockServerState = (
  id: string,
  name: string,
  status: McpServerStatus = { type: 'disconnected' }
): McpServerState => ({
  id,
  name,
  config: createMockConfig(name),
  status,
  tools: [],
  resources: [],
  prompts: [],
  reconnectAttempts: 0,
});

describe('useMcpStore', () => {
  beforeEach(() => {
    // Reset store state
    useMcpStore.setState({
      servers: [],
      isLoading: false,
      error: null,
      isInitialized: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useMcpStore.getState();
      expect(state.servers).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('sets up event listeners and loads servers', async () => {
      const mockServers = [createMockServerState('test-server', 'Test Server')];

      mockInvoke.mockResolvedValueOnce(mockServers);

      await act(async () => {
        await useMcpStore.getState().initialize();
      });

      expect(mockListen).toHaveBeenCalledWith('mcp:server-update', expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith('mcp:servers-changed', expect.any(Function));
      expect(mockInvoke).toHaveBeenCalledWith('mcp_get_servers');
      expect(useMcpStore.getState().isInitialized).toBe(true);
    });

    it('does not re-initialize if already initialized', async () => {
      useMcpStore.setState({ isInitialized: true });

      await act(async () => {
        await useMcpStore.getState().initialize();
      });

      expect(mockListen).not.toHaveBeenCalled();
    });

    it('sets error on initialization failure', async () => {
      mockListen.mockRejectedValueOnce(new Error('Init failed'));

      await act(async () => {
        await useMcpStore.getState().initialize();
      });

      expect(useMcpStore.getState().error).toBe('Error: Init failed');
    });
  });

  describe('loadServers', () => {
    it('loads servers from backend', async () => {
      const mockServers = [
        {
          ...createMockServerState('server-1', 'Server 1', { type: 'connected' }),
          tools: [{ name: 'tool1', description: 'Test tool', inputSchema: {} }],
        },
      ];

      mockInvoke.mockResolvedValueOnce(mockServers);

      await act(async () => {
        await useMcpStore.getState().loadServers();
      });

      expect(useMcpStore.getState().servers).toEqual(mockServers);
      expect(useMcpStore.getState().isLoading).toBe(false);
    });

    it('sets error on load failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Load failed'));

      await act(async () => {
        await useMcpStore.getState().loadServers();
      });

      expect(useMcpStore.getState().error).toBe('Error: Load failed');
      expect(useMcpStore.getState().isLoading).toBe(false);
    });
  });

  describe('addServer', () => {
    it('adds a new server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // mcp_add_server
      mockInvoke.mockResolvedValueOnce([]); // loadServers

      await act(async () => {
        await useMcpStore.getState().addServer('new-server', createMockConfig('New Server'));
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_add_server', {
        id: 'new-server',
        config: expect.objectContaining({ name: 'New Server' }),
      });
    });

    it('throws error on add failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Add failed'));

      await expect(
        useMcpStore.getState().addServer('new-server', createMockConfig('New Server'))
      ).rejects.toThrow('Add failed');

      expect(useMcpStore.getState().error).toBe('Error: Add failed');
    });
  });

  describe('removeServer', () => {
    it('removes a server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // mcp_remove_server
      mockInvoke.mockResolvedValueOnce([]); // loadServers

      await act(async () => {
        await useMcpStore.getState().removeServer('server-to-remove');
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_remove_server', { id: 'server-to-remove' });
    });
  });

  describe('connectServer', () => {
    it('connects to a server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useMcpStore.getState().connectServer('server-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_connect_server', { id: 'server-1' });
    });
  });

  describe('disconnectServer', () => {
    it('disconnects from a server', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await useMcpStore.getState().disconnectServer('server-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_disconnect_server', { id: 'server-1' });
    });
  });

  describe('callTool', () => {
    it('calls a tool on a server', async () => {
      const mockResult = {
        content: [{ type: 'text', text: 'Tool result' }],
        isError: false,
      };
      mockInvoke.mockResolvedValueOnce(mockResult);

      const result = await useMcpStore
        .getState()
        .callTool('server-1', 'test-tool', { arg: 'value' });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_call_tool', {
        serverId: 'server-1',
        toolName: 'test-tool',
        arguments: { arg: 'value' },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('readResource', () => {
    it('reads a resource from a server', async () => {
      const mockContent = {
        uri: 'file://test.txt',
        mimeType: 'text/plain',
        text: 'File content',
      };
      mockInvoke.mockResolvedValueOnce(mockContent);

      const result = await useMcpStore.getState().readResource('server-1', 'file://test.txt');

      expect(mockInvoke).toHaveBeenCalledWith('mcp_read_resource', {
        serverId: 'server-1',
        uri: 'file://test.txt',
      });
      expect(result).toEqual(mockContent);
    });
  });

  describe('getPrompt', () => {
    it('gets a prompt from a server', async () => {
      const mockPrompt = {
        messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
      };
      mockInvoke.mockResolvedValueOnce(mockPrompt);

      const result = await useMcpStore
        .getState()
        .getPrompt('server-1', 'greeting', { name: 'Test' });

      expect(mockInvoke).toHaveBeenCalledWith('mcp_get_prompt', {
        serverId: 'server-1',
        name: 'greeting',
        arguments: { name: 'Test' },
      });
      expect(result).toEqual(mockPrompt);
    });
  });

  describe('getAllTools', () => {
    it('gets all tools from all servers', async () => {
      const mockTools = [
        ['server-1', { name: 'tool1', description: 'Tool 1' }],
        ['server-2', { name: 'tool2', description: 'Tool 2' }],
      ];
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'mcp_get_all_tools') {
          return Promise.resolve(mockTools);
        }
        return Promise.resolve(undefined);
      });

      const result = await useMcpStore.getState().getAllTools();

      expect(mockInvoke).toHaveBeenCalledWith('mcp_get_all_tools');
      expect(result).toEqual([
        { serverId: 'server-1', tool: { name: 'tool1', description: 'Tool 1' } },
        { serverId: 'server-2', tool: { name: 'tool2', description: 'Tool 2' } },
      ]);
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      useMcpStore.setState({ error: 'Some error' });

      act(() => {
        useMcpStore.getState().clearError();
      });

      expect(useMcpStore.getState().error).toBeNull();
    });
  });

  describe('internal state updates', () => {
    it('_updateServer updates a specific server', () => {
      const initialServers = [
        createMockServerState('server-1', 'Server 1'),
        createMockServerState('server-2', 'Server 2'),
      ];
      useMcpStore.setState({ servers: initialServers });

      act(() => {
        useMcpStore.getState()._updateServer({
          ...createMockServerState('server-1', 'Server 1', { type: 'connected' }),
          tools: [{ name: 'new-tool', inputSchema: {} }],
        });
      });

      const state = useMcpStore.getState();
      expect(state.servers[0].status).toEqual({ type: 'connected' });
      expect(state.servers[0].tools).toHaveLength(1);
      expect(state.servers[1].status).toEqual({ type: 'disconnected' });
    });

    it('_setServers replaces all servers', () => {
      useMcpStore.setState({ servers: [createMockServerState('old', 'Old Server')] });

      const newServers = [
        createMockServerState('new-1', 'New Server 1', { type: 'connected' }),
        createMockServerState('new-2', 'New Server 2'),
      ];

      act(() => {
        useMcpStore.getState()._setServers(newServers);
      });

      expect(useMcpStore.getState().servers).toEqual(newServers);
    });
  });

  // =========================================================================
  // Tool Selection State Tests
  // =========================================================================

  describe('tool selection config', () => {
    beforeEach(() => {
      useMcpStore.setState({
        toolSelectionConfig: { ...DEFAULT_TOOL_SELECTION_CONFIG },
        toolUsageHistory: new Map<string, ToolUsageRecord>(),
        lastToolSelection: null,
      });
    });

    it('has default tool selection config', () => {
      const state = useMcpStore.getState();
      expect(state.toolSelectionConfig).toEqual(DEFAULT_TOOL_SELECTION_CONFIG);
    });

    it('setToolSelectionConfig updates config partially', () => {
      act(() => {
        useMcpStore.getState().setToolSelectionConfig({ maxTools: 30 });
      });

      const state = useMcpStore.getState();
      expect(state.toolSelectionConfig.maxTools).toBe(30);
      expect(state.toolSelectionConfig.strategy).toBe(DEFAULT_TOOL_SELECTION_CONFIG.strategy);
    });

    it('setToolSelectionConfig merges multiple updates', () => {
      act(() => {
        useMcpStore.getState().setToolSelectionConfig({ maxTools: 25 });
        useMcpStore.getState().setToolSelectionConfig({ strategy: 'manual' });
      });

      const state = useMcpStore.getState();
      expect(state.toolSelectionConfig.maxTools).toBe(25);
      expect(state.toolSelectionConfig.strategy).toBe('manual');
    });
  });

  describe('tool usage history', () => {
    beforeEach(() => {
      useMcpStore.setState({
        toolUsageHistory: new Map<string, ToolUsageRecord>(),
      });
    });

    it('recordToolUsage creates new record', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 100);
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record).toBeDefined();
      expect(record?.usageCount).toBe(1);
      expect(record?.successCount).toBe(1);
      expect(record?.failureCount).toBe(0);
      expect(record?.avgExecutionTime).toBe(100);
    });

    it('recordToolUsage updates existing record', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 100);
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 200);
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record?.usageCount).toBe(2);
      expect(record?.successCount).toBe(2);
      expect(record?.avgExecutionTime).toBe(150); // (100 + 200) / 2
    });

    it('recordToolUsage tracks failures', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true, 100);
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', false, 50);
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record?.usageCount).toBe(2);
      expect(record?.successCount).toBe(1);
      expect(record?.failureCount).toBe(1);
    });

    it('recordToolUsage updates lastUsedAt', () => {
      const beforeTime = Date.now();

      act(() => {
        useMcpStore.getState().recordToolUsage('mcp_server1_tool', true);
      });

      const afterTime = Date.now();
      const history = useMcpStore.getState().getToolUsageHistory();
      const record = history.get('mcp_server1_tool');

      expect(record?.lastUsedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(record?.lastUsedAt).toBeLessThanOrEqual(afterTime);
    });

    it('resetToolUsageHistory clears all history', () => {
      act(() => {
        useMcpStore.getState().recordToolUsage('tool1', true);
        useMcpStore.getState().recordToolUsage('tool2', true);
        useMcpStore.getState().resetToolUsageHistory();
      });

      const history = useMcpStore.getState().getToolUsageHistory();
      expect(history.size).toBe(0);
    });
  });

  describe('last tool selection', () => {
    it('setLastToolSelection stores selection result', () => {
      const selection = {
        selectedToolNames: ['tool1', 'tool2'],
        excludedToolNames: ['tool3'],
        totalAvailable: 3,
        selectionReason: 'Test selection',
        relevanceScores: { tool1: 0.8, tool2: 0.6 },
        wasLimited: true,
      };

      act(() => {
        useMcpStore.getState().setLastToolSelection(selection);
      });

      expect(useMcpStore.getState().lastToolSelection).toEqual(selection);
    });

    it('setLastToolSelection can clear selection', () => {
      act(() => {
        useMcpStore.getState().setLastToolSelection({
          selectedToolNames: ['tool1'],
          excludedToolNames: [],
          totalAvailable: 1,
          selectionReason: 'Test',
          relevanceScores: {},
          wasLimited: false,
        });
        useMcpStore.getState().setLastToolSelection(null);
      });

      expect(useMcpStore.getState().lastToolSelection).toBeNull();
    });
  });
});
